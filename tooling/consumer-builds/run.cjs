const fs = require('node:fs');
const path = require('node:path');
const {execFileSync} = require('node:child_process');
const {enabledBundlers} = require('./config.cjs');
const {CANDIDATES, readCandidates} = require('./candidates.cjs');
const {checkBrowser} = require('./smoke.cjs');

const ROOT = path.resolve(__dirname, '../..');
const GENERATED = path.join(ROOT, '.generated/consumer-builds');
const COMMANDS = {
  webpack: ['node_modules/webpack-cli/bin/cli.js', '--config', 'webpack.config.cjs'],
  vite: ['node_modules/vite/bin/vite.js', 'build'],
  parcel: ['node_modules/parcel/lib/bin.js', 'build', 'index.html', '--dist-dir', 'dist/parcel', '--no-cache'],
  rollup: ['node_modules/rollup/dist/bin/rollup', '--config', 'rollup.config.mjs'],
  esbuild: ['esbuild.mjs'],
};

async function run(bundler, candidateDirectory = CANDIDATES) {
  if (!enabledBundlers().includes(bundler)) throw new Error(`Bundler is disabled or unknown: ${bundler}`);
  const directory = path.join(GENERATED, bundler);
  const reports = path.join(GENERATED, 'reports', bundler);
  fs.mkdirSync(reports, {recursive: true});
  const result = {bundler, status: 'failed'};
  const log = fs.openSync(path.join(reports, 'build.log'), 'w');
  try {
    const manifest = readCandidates(candidateDirectory);
    const candidates = manifest.filter((entry) => entry.name.startsWith('@webex/cc-'));
    if (candidates.length !== 9) throw new Error('Expected all nine Contact Center package archives.');
    fs.mkdirSync(directory, {recursive: true});
    fs.cpSync(path.join(__dirname, 'fixture'), directory, {recursive: true});
    const execute = (command, args) =>
      execFileSync(command, args, {
        cwd: directory,
        env: {...process.env, NODE_OPTIONS: '--max-old-space-size=8192', PARCEL_WORKERS: '2'},
        stdio: ['ignore', log, log],
      });
    execute('npm', ['ci', '--legacy-peer-deps', '--no-audit', '--no-fund']);
    execute('npm', [
      'install',
      '--no-save',
      '--package-lock=false',
      '--legacy-peer-deps',
      '--no-audit',
      '--no-fund',
      ...candidates.map((entry) => path.join(candidateDirectory, entry.file)),
    ]);
    for (const entry of candidates) {
      const installed = JSON.parse(
        fs.readFileSync(path.join(directory, 'node_modules', entry.name, 'package.json'), 'utf8')
      );
      if (installed.version !== entry.version) throw new Error(`Wrong consumer package version: ${entry.name}`);
    }
    result.packages = candidates.map(({name, version, sha256}) => ({name, version, sha256}));
    execute(process.execPath, COMMANDS[bundler]);
    if (['webpack', 'rollup', 'esbuild'].includes(bundler)) {
      const script =
        bundler === 'webpack' ? '<script src="./main.js"></script>' : '<script type="module" src="./main.js"></script>';
      const style = fs.existsSync(path.join(directory, 'dist', bundler, 'main.css'))
        ? '<link rel="stylesheet" href="./main.css">'
        : '';
      fs.writeFileSync(
        path.join(directory, 'dist', bundler, 'index.html'),
        `<!doctype html><meta charset="utf-8">${style}${script}`
      );
    }
    execute(process.execPath, [
      'node_modules/@playwright/test/cli.js',
      'install',
      'chromium',
      ...(process.env.CI ? ['--with-deps'] : []),
    ]);
    await checkBrowser(directory, bundler);
    result.status = 'passed';
  } catch (error) {
    result.error = error.message;
    throw error;
  } finally {
    fs.closeSync(log);
    fs.writeFileSync(path.join(reports, 'result.json'), JSON.stringify(result, null, 2) + '\n');
    console.log(`${bundler}: ${result.status}. Reports: ${reports}`);
  }
}

module.exports = {run};

if (require.main === module) {
  const [bundler, candidateDirectory] = process.argv.slice(2);
  run(bundler, candidateDirectory ? path.resolve(candidateDirectory) : CANDIDATES).catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
