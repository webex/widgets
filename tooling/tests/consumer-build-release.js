const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {execFileSync} = require('node:child_process');
const YAML = require('yaml');

const deploy = YAML.parse(fs.readFileSync(path.join(__dirname, '../../.github/workflows/deploy.yml'), 'utf8'));
const prepare = deploy.jobs['prepare-release'];
const publish = deploy.jobs['publish-npm'];
const localGitVariables = execFileSync('git', ['rev-parse', '--local-env-vars'], {encoding: 'utf8'}).trim().split('\n');

describe('existing release tooling after consumer checks', () => {
  let directory;
  const manifest = 'packages/contact-center/cc-widgets/package.json';
  const patch = '.generated/consumer-builds/candidates/release-manifests.patch';
  const execute = (command, args, env = {}) => {
    const environment = {...process.env, ...env};
    // A commit hook sets Git variables for the parent checkout. Tests use a separate repository.
    for (const name of localGitVariables) delete environment[name];
    return execFileSync(command, args, {
      cwd: directory,
      encoding: 'utf8',
      env: environment,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  };
  const run = (script, env) => execute('bash', ['-e', '-c', script], env);

  beforeEach(() => {
    directory = fs.mkdtempSync(path.join(os.tmpdir(), 'widget-release-'));
    fs.mkdirSync(path.join(directory, path.dirname(manifest)), {recursive: true});
    fs.mkdirSync(path.join(directory, path.dirname(patch)), {recursive: true});
    fs.writeFileSync(path.join(directory, manifest), '{"name":"@webex/cc-widgets","version":"1.0.0-next.1"}\n');
    execute('git', ['init', '--quiet']);
    execute('git', ['add', manifest]);
  });

  afterEach(() => fs.rmSync(directory, {recursive: true, force: true}));

  it('restores prepared versions without querying the registry again', () => {
    const original = fs.readFileSync(path.join(directory, manifest));
    const prepared = '{"name":"@webex/cc-widgets","version":"1.0.0-next.2"}\n';
    fs.writeFileSync(path.join(directory, manifest), prepared);
    run(prepare.steps.find((step) => step.name === 'Save Prepared Package Versions').run);
    expect(fs.readFileSync(path.join(directory, patch), 'utf8')).toContain('1.0.0-next.2');
    fs.writeFileSync(path.join(directory, manifest), original);
    run(publish.steps.find((step) => step.name === 'Restore Prepared Package Versions').run);
    expect(fs.readFileSync(path.join(directory, manifest), 'utf8')).toBe(prepared);
  });

  it('accepts an empty version patch', () => {
    run(prepare.steps.find((step) => step.name === 'Save Prepared Package Versions').run);
    expect(fs.readFileSync(path.join(directory, patch), 'utf8')).toBe('');
    expect(() =>
      run(publish.steps.find((step) => step.name === 'Restore Prepared Package Versions').run)
    ).not.toThrow();
  });

  it('rejects a patch that cannot apply to the checkout', () => {
    fs.writeFileSync(path.join(directory, manifest), '{"name":"@webex/cc-widgets","version":"1.0.0-next.2"}\n');
    run(prepare.steps.find((step) => step.name === 'Save Prepared Package Versions').run);
    fs.writeFileSync(path.join(directory, manifest), '{"name":"@webex/cc-widgets","version":"1.0.0-next.42"}\n');
    expect(() => run(publish.steps.find((step) => step.name === 'Restore Prepared Package Versions').run)).toThrow();
  });

  it('uses the existing workspace deploy script and forwards the packages and tag', () => {
    const bin = path.join(directory, 'bin');
    fs.mkdirSync(bin);
    fs.writeFileSync(
      path.join(bin, 'yarn'),
      '#!/bin/sh\nprintf "%s\\n" "$@" > "$CALL_LOG"\nexit "${DEPLOY_EXIT:-0}"\n',
      {mode: 0o755}
    );
    const env = {
      PATH: `${bin}:${process.env.PATH}`,
      CALL_LOG: path.join(directory, 'calls'),
      PACKAGES: '{@webex/cc-store,@webex/cc-widgets}',
      GITHUB_REF_NAME: 'next',
    };
    const step = publish.steps.find((item) => item.name === 'Deploy Packages');
    run(step.run, env);
    expect(fs.readFileSync(env.CALL_LOG, 'utf8').trim().split('\n')).toEqual([
      'workspaces',
      'foreach',
      '-W',
      '--from',
      env.PACKAGES,
      '--verbose',
      'run',
      'deploy:npm',
      '--access',
      'public',
      '--tag',
      'next',
    ]);
    expect(() => run(step.run, {...env, DEPLOY_EXIT: '7'})).toThrow();
  });

  it('restores dependencies before prepared versions and requires the production build cache', () => {
    const names = publish.steps.map((step) => step.name);
    expect(names.indexOf('Install Dependencies')).toBeLessThan(names.indexOf('Restore Prepared Package Versions'));
    expect(names.indexOf('Restore Prepared Package Versions')).toBeLessThan(names.indexOf('Deploy Packages'));
    const cache = publish.steps.find((step) => step.name === 'Restore Distributables Cache');
    expect(cache.with).toMatchObject({path: '**/dist', key: 'dist-${{ env.rid }}', 'fail-on-cache-miss': true});
    expect(publish.steps.some((step) => /build:prod|package-tools (sync|increment)/.test(step.run || ''))).toBe(false);
    const step = publish.steps.find((item) => item.name === 'Deploy Packages');
    expect(step.env.YARN_NPM_AUTH_TOKEN).toBe('${{ secrets.NPM_TOKEN }}');
  });
});
