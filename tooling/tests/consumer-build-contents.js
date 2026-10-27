const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {createHash} = require('node:crypto');
const {execFileSync} = require('node:child_process');
const {packCandidates, readCandidates, verifyWorkspaces} = require('../consumer-builds/candidates.cjs');

jest.mock('node:child_process');

describe('restored workspace contents before publishing', () => {
  const execute = jest.requireActual('node:child_process').execFileSync;
  const workspaces = [
    {name: '@webex/cc-widgets', location: 'packages/contact-center/cc-widgets'},
    {name: '@webex/cc-store', location: 'packages/contact-center/store'},
  ];
  const hash = (file) => createHash('sha256').update(fs.readFileSync(file)).digest('hex');
  let directory;
  let candidates;
  let listed;
  let destinations;
  let extraEntry;
  const workspace = (name = 'webex-cc-widgets') => path.join(directory, name, 'package');
  const output = () => path.join(workspace(), 'dist/index.js');

  beforeEach(() => {
    jest.resetAllMocks();
    directory = fs.mkdtempSync(path.join(os.tmpdir(), 'widget-workspace-contents-'));
    candidates = path.join(directory, 'candidates');
    listed = workspaces;
    destinations = new Set();
    extraEntry = false;
    for (const entry of workspaces) {
      const folder = workspace(entry.name.slice(1).replace('/', '-'));
      fs.mkdirSync(path.join(folder, 'dist'), {recursive: true});
      fs.copyFileSync(path.join(__dirname, '../..', entry.location, 'package.json'), path.join(folder, 'package.json'));
      fs.writeFileSync(path.join(folder, 'dist/index.js'), 'export const ready = true;\n', {mode: 0o644});
    }
    execFileSync.mockImplementation((command, args, options) => {
      if (command !== 'yarn') return execute(command, args, options);
      if (args[0] === 'workspaces') return listed.map((entry) => JSON.stringify(entry)).join('\n');
      const folder = workspace(args[1].slice(1).replace('/', '-'));
      destinations.add(path.dirname(args[4]));
      execute('tar', ['-czf', args[4], '-C', path.dirname(folder), 'package', ...(extraEntry ? ['extra.txt'] : [])]);
      return '';
    });
    packCandidates(candidates);
  });

  afterEach(() => {
    const remaining = [...destinations].filter(
      (destination) => destination !== candidates && fs.existsSync(destination)
    );
    fs.rmSync(directory, {recursive: true, force: true});
    expect(remaining).toEqual([]);
  });

  it('accepts restored workspaces with the tested contents', () => {
    expect(() => verifyWorkspaces(candidates)).not.toThrow();
  });

  it('ignores archive timestamps when the contents match', () => {
    fs.utimesSync(output(), new Date('2000-01-01'), new Date('2000-01-01'));
    const other = path.join(directory, 'different-timestamps');
    packCandidates(other);
    destinations.delete(other);
    expect(hash(path.join(other, 'webex-cc-widgets.tgz'))).not.toBe(
      hash(path.join(candidates, 'webex-cc-widgets.tgz'))
    );
    expect(() => verifyWorkspaces(candidates)).not.toThrow();
  });

  it.each([
    ['changed build output', () => fs.writeFileSync(output(), 'throw new Error("broken workspace");\n')],
    ['an added file', () => fs.writeFileSync(path.join(workspace(), 'dist/extra.js'), 'export {};\n')],
    ['a removed file', () => fs.unlinkSync(output())],
    ['a changed package manifest', () => fs.appendFileSync(path.join(workspace(), 'package.json'), '\n')],
    ['changed executable permissions', () => fs.chmodSync(output(), 0o755)],
  ])('blocks publishing for %s while the tested archive remains valid', (_name, change) => {
    const before = hash(path.join(candidates, 'webex-cc-widgets.tgz'));
    change();
    expect(() => readCandidates(candidates)).not.toThrow();
    expect(() => verifyWorkspaces(candidates)).toThrow(/Workspace contents differ/);
    expect(hash(path.join(candidates, 'webex-cc-widgets.tgz'))).toBe(before);
  });

  it('rejects a different workspace package set', () => {
    listed = workspaces.slice(0, 1);
    expect(() => verifyWorkspaces(candidates)).toThrow(/Workspace package manifest differs/);
  });

  it('rejects a different version from the tested manifest', () => {
    const manifestFile = path.join(candidates, 'manifest.json');
    const manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
    const reference = path.join(directory, 'reference');
    fs.mkdirSync(path.join(reference, 'package'), {recursive: true});
    fs.writeFileSync(
      path.join(reference, 'package/package.json'),
      JSON.stringify({name: manifest[0].name, version: '0.0.0'})
    );
    const archive = path.join(candidates, manifest[0].file);
    execute('tar', ['-czf', archive, '-C', reference, 'package']);
    manifest[0] = {...manifest[0], version: '0.0.0', sha256: hash(archive)};
    fs.writeFileSync(manifestFile, JSON.stringify(manifest));
    expect(() => verifyWorkspaces(candidates)).toThrow(/Workspace package manifest differs/);
  });

  it('rejects archive links before extracting files', () => {
    fs.unlinkSync(output());
    fs.symlinkSync('../package.json', output());
    expect(() => verifyWorkspaces(candidates)).toThrow(/Unsafe package archive/);
  });

  it('rejects archive entries outside the package directory', () => {
    extraEntry = true;
    for (const entry of workspaces) {
      fs.writeFileSync(path.join(path.dirname(workspace(entry.name.slice(1).replace('/', '-'))), 'extra.txt'), 'extra');
    }
    expect(() => verifyWorkspaces(candidates)).toThrow(/Unsafe package archive/);
  });

  it.each([false, true])(
    'runs the publish step only after CLI verification succeeds (changed output: %s)',
    (changed) => {
      const bin = path.join(directory, 'bin');
      fs.mkdirSync(bin);
      fs.writeFileSync(
        path.join(bin, 'yarn'),
        `#!/usr/bin/env node
const path = require('node:path');
const {execFileSync} = require('node:child_process');
const args = process.argv.slice(2);
if (args[0] === 'workspaces') {
  console.log(${JSON.stringify(workspaces)}.map((entry) => JSON.stringify(entry)).join('\\n'));
} else {
  const folder = path.join(${JSON.stringify(directory)}, args[1].slice(1).replace('/', '-'));
  execFileSync('tar', ['-czf', args[4], '-C', folder, 'package']);
}
`,
        {mode: 0o755}
      );
      if (changed) fs.writeFileSync(output(), 'throw new Error("broken workspace");\n');
      const marker = path.join(directory, 'publish-reached');
      const run = () =>
        execute(
          'bash',
          ['-e', '-c', '"$NODE_BINARY" "$VERIFIER" verify "$CANDIDATES"\nprintf reached > "$PUBLISH_MARKER"'],
          {
            env: {
              ...process.env,
              PATH: `${bin}:${process.env.PATH}`,
              NODE_BINARY: process.execPath,
              VERIFIER: path.resolve(__dirname, '../consumer-builds/candidates.cjs'),
              CANDIDATES: candidates,
              PUBLISH_MARKER: marker,
            },
            stdio: ['ignore', 'pipe', 'pipe'],
          }
        );
      if (changed) {
        try {
          run();
          throw new Error('The verifier accepted changed workspace contents.');
        } catch (error) {
          expect(error.status).toBeGreaterThan(0);
          expect(error.stderr.toString()).toContain('Workspace contents differ');
        }
      } else {
        expect(run).not.toThrow();
      }
      expect(fs.existsSync(marker)).toBe(!changed);
    }
  );
});
