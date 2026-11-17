const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {execFileSync} = require('node:child_process');
const {CANDIDATES, readCandidates} = require('../consumer-builds/candidates.cjs');
const {publishWorkspace} = require('../release/publish.cjs');

jest.mock('node:child_process');
jest.mock('../consumer-builds/candidates.cjs', () => ({
  CANDIDATES: '/tested-candidates',
  readCandidates: jest.fn(),
}));

describe('npm publishing from Yarn archives', () => {
  let directory;
  let temporaryArchive;
  const args = ['--access', 'public', '--tag', 'next', '--dry-run'];
  const writePackage = (data) => fs.writeFileSync(path.join(directory, 'package.json'), JSON.stringify(data));

  beforeEach(() => {
    jest.resetAllMocks();
    directory = fs.mkdtempSync(path.join(os.tmpdir(), 'widget-publish-test-'));
    temporaryArchive = undefined;
    writePackage({name: '@webex/cc-store', version: '1.0.0-next.2'});
    readCandidates.mockReturnValue([
      {name: '@webex/cc-widgets', version: '1.0.0-next.2', file: 'webex-cc-widgets.tgz'},
      {name: '@webex/cc-store', version: '1.0.0-next.2', file: 'webex-cc-store.tgz'},
    ]);
    execFileSync.mockImplementation((command, commandArgs) => {
      if (command === 'yarn') {
        temporaryArchive = commandArgs[commandArgs.indexOf('--out') + 1];
        fs.writeFileSync(temporaryArchive, 'packed workspace');
      }
    });
  });

  afterEach(() => {
    fs.rmSync(directory, {recursive: true, force: true});
    if (temporaryArchive) expect(fs.existsSync(path.dirname(temporaryArchive))).toBe(false);
  });

  it('publishes the selected tested CC archive with the release tag, public access, and dry-run flag', () => {
    publishWorkspace(args, directory);
    expect(readCandidates).toHaveBeenCalledWith(CANDIDATES);
    expect(execFileSync).toHaveBeenCalledTimes(1);
    expect(execFileSync).toHaveBeenCalledWith(
      'npm',
      ['publish', path.join(CANDIDATES, 'webex-cc-store.tgz'), ...args],
      expect.objectContaining({cwd: directory, stdio: 'inherit'})
    );
  });

  it.each([
    ['a missing package', []],
    ['a different prepared version', [{name: '@webex/cc-store', version: '1.0.0-next.1', file: 'webex-cc-store.tgz'}]],
  ])('stops before publishing for %s', (_reason, candidates) => {
    readCandidates.mockReturnValue(candidates);
    expect(() => publishWorkspace(args, directory)).toThrow();
    expect(execFileSync).not.toHaveBeenCalled();
  });

  it('stops when archive hash or identity validation fails', () => {
    readCandidates.mockImplementation(() => {
      throw new Error('Candidate hash mismatch: @webex/cc-store');
    });
    expect(() => publishWorkspace(args, directory)).toThrow(/Candidate hash mismatch/);
    expect(execFileSync).not.toHaveBeenCalled();
  });

  it.each([
    {name: '@webex/test-fixtures', version: '1.0.0'},
    {name: '@webex/cc-store', version: '1.0.0', private: true},
  ])('rejects an unsupported or private workspace: $name', (data) => {
    writePackage(data);
    expect(() => publishWorkspace(args, directory)).toThrow();
    expect(execFileSync).not.toHaveBeenCalled();
  });

  it.each([false, true])(
    'packs the meetings workspace with Yarn and removes temporary files (npm fails: %s)',
    (fails) => {
      writePackage({name: '@webex/widgets', version: '1.0.0-next.2'});
      const pack = execFileSync.getMockImplementation();
      execFileSync.mockImplementation((command, commandArgs, options) => {
        if (command === 'yarn') return pack(command, commandArgs, options);
        expect(fs.readFileSync(temporaryArchive, 'utf8')).toBe('packed workspace');
        if (fails) throw new Error('npm publish failed');
      });
      if (fails) expect(() => publishWorkspace(args, directory)).toThrow(/npm publish failed/);
      else publishWorkspace(args, directory);
      expect(readCandidates).not.toHaveBeenCalled();
      expect(execFileSync).toHaveBeenNthCalledWith(
        1,
        'yarn',
        ['pack', '--out', temporaryArchive],
        expect.objectContaining({cwd: directory, stdio: 'inherit'})
      );
      expect(execFileSync).toHaveBeenNthCalledWith(
        2,
        'npm',
        ['publish', temporaryArchive, ...args],
        expect.objectContaining({cwd: directory, stdio: 'inherit'})
      );
    }
  );

  it('reports npm failure to the release job', () => {
    execFileSync.mockImplementation(() => {
      throw new Error('npm publish failed');
    });
    expect(() => publishWorkspace(args, directory)).toThrow(/npm publish failed/);
  });

  it('removes temporary files and stops publishing if Yarn cannot pack the meetings workspace', () => {
    writePackage({name: '@webex/widgets', version: '1.0.0-next.2'});
    execFileSync.mockImplementation((_command, commandArgs) => {
      temporaryArchive = commandArgs[commandArgs.indexOf('--out') + 1];
      throw new Error('Yarn pack failed');
    });
    expect(() => publishWorkspace(args, directory)).toThrow(/Yarn pack failed/);
    expect(execFileSync).toHaveBeenCalledTimes(1);
  });
});
