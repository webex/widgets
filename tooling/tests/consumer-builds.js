const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {createHash} = require('node:crypto');
const {execFileSync} = require('node:child_process');
const {enabledBundlers, BUNDLERS} = require('../consumer-builds/config.cjs');
const {
  selectPackages,
  packCandidates,
  readCandidates,
  publishCandidates,
} = require('../consumer-builds/candidates.cjs');

jest.mock('node:child_process');

describe('consumer build configuration', () => {
  const config = () => Object.fromEntries(BUNDLERS.map((name) => [name, {enabled: true}]));

  it('enables all five bundlers by default', () => {
    expect(enabledBundlers()).toEqual(['webpack', 'vite', 'parcel', 'rollup', 'esbuild']);
  });

  it('omits a bundler only when its flag is false', () => {
    const value = config();
    value.parcel.enabled = false;
    expect(enabledBundlers(value)).toEqual(['webpack', 'vite', 'rollup', 'esbuild']);
  });

  it.each([
    ['an unknown bundler', {...config(), unknown: {enabled: true}}],
    ['a missing bundler', {webpack: {enabled: true}}],
    ['a string flag', {...config(), vite: {enabled: 'false'}}],
    ['a missing flag', {...config(), vite: {}}],
    ['an empty configuration', null],
    ['all bundlers disabled', Object.fromEntries(BUNDLERS.map((name) => [name, {enabled: false}]))],
  ])('rejects %s', (_name, value) => {
    expect(() => enabledBundlers(value)).toThrow();
  });
});

describe('release candidate archives', () => {
  let directory;
  const workspaces = [
    {name: '@webex/cc-widgets', location: 'packages/contact-center/cc-widgets'},
    {name: '@webex/cc-store', location: 'packages/contact-center/store'},
    {name: '@webex/widgets', location: 'packages/@webex/widgets'},
    {name: '@webex/test-fixtures', location: 'packages/contact-center/test-fixtures'},
  ];

  beforeEach(() => {
    jest.resetAllMocks();
    directory = fs.mkdtempSync(path.join(os.tmpdir(), 'widget-candidates-'));
    fs.writeFileSync(path.join(directory, 'webex-cc-widgets.tgz'), 'candidate bytes');
    const sha256 = createHash('sha256').update('candidate bytes').digest('hex');
    fs.writeFileSync(
      path.join(directory, 'manifest.json'),
      JSON.stringify([
        {name: '@webex/cc-widgets', version: '1.0.0-next.1', file: 'webex-cc-widgets.tgz', sha256, publish: true},
      ])
    );
    execFileSync.mockReturnValue(JSON.stringify({name: '@webex/cc-widgets', version: '1.0.0-next.1'}));
  });

  afterEach(() => fs.rmSync(directory, {recursive: true, force: true}));

  it('packs all CC packages and only the changed legacy package', () => {
    expect(selectPackages(workspaces, []).map((entry) => entry.name)).toEqual(['@webex/cc-widgets', '@webex/cc-store']);
    expect(selectPackages(workspaces, ['@webex/widgets', '@webex/test-fixtures'])).toEqual([
      {...workspaces[0], publish: false},
      {...workspaces[1], publish: false},
      {...workspaces[2], publish: true},
    ]);
  });

  it('rejects an unknown changed workspace', () => {
    expect(() => selectPackages(workspaces, ['@webex/missing'])).toThrow();
  });

  it('packs Yarn workspaces and records the exact archive hash', () => {
    const {version} = require('../../packages/contact-center/cc-widgets/package.json');
    execFileSync.mockImplementation((command, args) => {
      if (command === 'tar') return JSON.stringify({name: '@webex/cc-widgets', version});
      if (args[0] === 'workspaces') return JSON.stringify(workspaces[0]);
      fs.writeFileSync(args[4], 'candidate bytes');
      return '';
    });
    packCandidates(directory, ['@webex/cc-widgets']);
    expect(readCandidates(directory)[0]).toMatchObject({name: '@webex/cc-widgets', version, publish: true});
    expect(execFileSync).toHaveBeenCalledWith(
      'yarn',
      ['workspace', '@webex/cc-widgets', 'pack', '--out', path.join(directory, 'webex-cc-widgets.tgz')],
      expect.any(Object)
    );
  });

  it.each([[], {}])('rejects an empty or invalid manifest %j', (value) => {
    fs.writeFileSync(path.join(directory, 'manifest.json'), JSON.stringify(value));
    expect(() => readCandidates(directory)).toThrow();
  });

  it('verifies archive hashes and embedded package identity', () => {
    expect(readCandidates(directory)[0].name).toBe('@webex/cc-widgets');
    expect(execFileSync).toHaveBeenCalledWith(
      'tar',
      ['-xOf', path.join(directory, 'webex-cc-widgets.tgz'), 'package/package.json'],
      expect.any(Object)
    );
  });

  it('rejects tampered bytes before any publish', () => {
    fs.appendFileSync(path.join(directory, 'webex-cc-widgets.tgz'), 'tampered');
    expect(() => publishCandidates(directory, 'next')).toThrow(/hash/);
    expect(execFileSync).not.toHaveBeenCalled();
  });

  it('rejects a different embedded package version', () => {
    execFileSync.mockReturnValue(JSON.stringify({name: '@webex/cc-widgets', version: '1.0.0-next.2'}));
    expect(() => readCandidates(directory)).toThrow(/identity/);
  });

  it.each([
    {file: '../candidate.tgz'},
    {name: '@webex/cc-widgets;bad'},
    {sha256: 'bad'},
    {publish: 'true'},
    {version: ''},
  ])('rejects invalid manifest data %j', (change) => {
    const filename = path.join(directory, 'manifest.json');
    const [entry] = JSON.parse(fs.readFileSync(filename));
    fs.writeFileSync(filename, JSON.stringify([{...entry, ...change}]));
    expect(() => readCandidates(directory)).toThrow();
  });

  it('rejects duplicate archives', () => {
    const filename = path.join(directory, 'manifest.json');
    const [entry] = JSON.parse(fs.readFileSync(filename));
    fs.writeFileSync(filename, JSON.stringify([entry, entry]));
    expect(() => readCandidates(directory)).toThrow();
  });

  it('publishes the verified tarball with a validated tag', () => {
    publishCandidates(directory, 'next', true);
    expect(execFileSync).toHaveBeenLastCalledWith(
      'npm',
      [
        'publish',
        path.join(directory, 'webex-cc-widgets.tgz'),
        '--access',
        'public',
        '--tag',
        'next',
        '--registry',
        'https://registry.npmjs.org',
        '--ignore-scripts',
        '--dry-run',
      ],
      expect.any(Object)
    );
  });

  it('does not publish an unchanged package', () => {
    const filename = path.join(directory, 'manifest.json');
    const [entry] = JSON.parse(fs.readFileSync(filename));
    fs.writeFileSync(filename, JSON.stringify([{...entry, publish: false}]));
    publishCandidates(directory, 'next');
    expect(execFileSync).toHaveBeenCalledTimes(1);
  });

  it('rejects invalid tags before executing commands', () => {
    expect(() => publishCandidates(directory, 'next;bad')).toThrow(/tag/);
    expect(execFileSync).not.toHaveBeenCalled();
  });

  it('propagates publish errors', () => {
    execFileSync
      .mockImplementationOnce(() => JSON.stringify({name: '@webex/cc-widgets', version: '1.0.0-next.1'}))
      .mockImplementationOnce(() => {
        throw new Error('publish failed');
      });
    expect(() => publishCandidates(directory, 'next')).toThrow('publish failed');
  });
});

describe('consumer workflow release gate', () => {
  const YAML = require('yaml');
  const deploy = YAML.parse(fs.readFileSync(path.join(__dirname, '../../.github/workflows/deploy.yml'), 'utf8'));
  const consumer = YAML.parse(
    fs.readFileSync(path.join(__dirname, '../../.github/workflows/consumer-builds.yml'), 'utf8')
  );

  it('runs the same matrix for pull requests and releases', () => {
    expect(consumer.on.pull_request.branches).toEqual(['next']);
    expect(consumer.on.workflow_call.inputs.bundlers.required).toBe(true);
    expect(consumer.jobs.prepare.steps.find((step) => step.id === 'config').run).toContain('config.cjs');
    expect(deploy.jobs['prepare-release'].steps.find((step) => step.id === 'config').run).toContain('config.cjs');
    expect(consumer.jobs.build.strategy['fail-fast']).toBe(false);
    expect(consumer.jobs.build.strategy.matrix.bundler).toContain('inputs.bundlers || needs.prepare.outputs.bundlers');
    expect(consumer.jobs.build['continue-on-error']).toBeUndefined();
  });

  it('requires successful consumer checks before npm publishing', () => {
    const publish = deploy.jobs['publish-npm'];
    expect(publish.needs).toEqual(['prepare-release', 'consumer-builds']);
    expect(publish.if).toContain("needs.consumer-builds.result == 'success'");
    expect(deploy.jobs['consumer-builds'].uses).toBe('./.github/workflows/consumer-builds.yml');
    expect(deploy.jobs['consumer-builds'].with['candidate-artifact']).toBe('consumer-candidates-release');
    expect(publish.steps.find((step) => step.name === 'Download Tested Release Candidates').with.name).toBe(
      'consumer-candidates-release'
    );
    expect(publish.outputs).toMatchObject({
      published: expect.stringContaining('has_changes'),
      package_versions: expect.stringContaining('package_versions'),
    });
  });

  it('isolates test jobs from publishing credentials', () => {
    expect(JSON.stringify(consumer)).not.toContain('secrets.');
    expect(JSON.stringify(deploy.jobs['prepare-release'])).not.toContain('secrets.');
    expect(deploy.env.token).toBeUndefined();
    expect(deploy.env.GH_TOKEN).toBeUndefined();
    expect(deploy.jobs['consumer-builds'].secrets).toBeUndefined();
    expect(consumer.permissions).toEqual({contents: 'read'});
  });
});
