const fs = require('node:fs');
const {execFileSync} = require('node:child_process');
const {readCandidates} = require('../consumer-builds/candidates.cjs');
const {checkBrowser} = require('../consumer-builds/smoke.cjs');
const {run} = require('../consumer-builds/run.cjs');

jest.mock('node:fs');
jest.mock('node:child_process');
jest.mock('../consumer-builds/candidates.cjs', () => ({CANDIDATES: '/candidates', readCandidates: jest.fn()}));
jest.mock('../consumer-builds/smoke.cjs', () => ({checkBrowser: jest.fn()}));

describe('consumer build runner', () => {
  const candidates = Array.from({length: 9}, (_, index) => ({
    name: `@webex/cc-package-${index}`,
    file: `package-${index}.tgz`,
    version: '1.0.0-next.1',
    sha256: 'a'.repeat(64),
  }));
  let consoleLog;

  beforeEach(() => {
    jest.resetAllMocks();
    readCandidates.mockReturnValue(candidates);
    fs.openSync.mockReturnValue(10);
    fs.readFileSync.mockReturnValue(JSON.stringify({version: '1.0.0-next.1'}));
    consoleLog = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => consoleLog.mockRestore());

  it.each(['webpack', 'vite', 'parcel', 'rollup', 'esbuild'])(
    'builds %s and checks browser startup',
    async (bundler) => {
      await run(bundler);
      expect(execFileSync).toHaveBeenNthCalledWith(
        1,
        'npm',
        ['ci', '--legacy-peer-deps', '--no-audit', '--no-fund'],
        expect.any(Object)
      );
      expect(execFileSync.mock.calls[1][1]).toEqual(
        expect.arrayContaining(candidates.map((entry) => `/candidates/${entry.file}`))
      );
      expect(checkBrowser).toHaveBeenCalledWith(expect.stringContaining(bundler), bundler);
      expect(fs.closeSync).toHaveBeenCalledWith(10);
      const report = JSON.parse(fs.writeFileSync.mock.calls.at(-1)[1]);
      expect(report).toMatchObject({
        bundler,
        status: 'passed',
        packages: expect.arrayContaining([
          {name: candidates[0].name, version: candidates[0].version, sha256: candidates[0].sha256},
        ]),
      });
    }
  );

  it('rejects unknown bundlers before starting commands', async () => {
    await expect(run('unknown')).rejects.toThrow('disabled or unknown');
    expect(execFileSync).not.toHaveBeenCalled();
  });

  it('rejects incomplete package sets', async () => {
    readCandidates.mockReturnValue(candidates.slice(1));
    await expect(run('vite')).rejects.toThrow('all nine');
    expect(execFileSync).not.toHaveBeenCalled();
    expect(fs.closeSync).toHaveBeenCalledWith(10);
  });

  it('rejects the wrong installed version', async () => {
    fs.readFileSync.mockReturnValue(JSON.stringify({version: '2.0.0'}));
    await expect(run('vite')).rejects.toThrow('Wrong consumer package version');
    expect(checkBrowser).not.toHaveBeenCalled();
  });

  it('fails and saves a report after a build error', async () => {
    execFileSync
      .mockImplementationOnce(() => {})
      .mockImplementationOnce(() => {})
      .mockImplementationOnce(() => {
        throw new Error('build failed');
      });
    await expect(run('vite')).rejects.toThrow('build failed');
    expect(checkBrowser).not.toHaveBeenCalled();
    expect(JSON.parse(fs.writeFileSync.mock.calls.at(-1)[1])).toMatchObject({status: 'failed', error: 'build failed'});
  });

  it('fails on a browser error', async () => {
    checkBrowser.mockRejectedValue(new Error('startup failed'));
    await expect(run('vite')).rejects.toThrow('startup failed');
    expect(JSON.parse(fs.writeFileSync.mock.calls.at(-1)[1])).toMatchObject({
      status: 'failed',
      error: 'startup failed',
    });
  });

  it('adds a stylesheet only when the build emits it', async () => {
    fs.existsSync.mockReturnValue(true);
    await run('rollup');
    expect(fs.writeFileSync.mock.calls[0][1]).toContain('main.css');
  });
});
