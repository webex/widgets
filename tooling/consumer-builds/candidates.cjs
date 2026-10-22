const fs = require('node:fs');
const path = require('node:path');
const {createHash} = require('node:crypto');
const {execFileSync} = require('node:child_process');

const ROOT = path.resolve(__dirname, '../..');
const CANDIDATES = path.join(ROOT, '.generated/consumer-builds/candidates');
const NAME = /^@webex\/cc-[a-z-]+$/;
const hash = (filename) => createHash('sha256').update(fs.readFileSync(filename)).digest('hex');

function packCandidates(directory = CANDIDATES) {
  const workspaces = execFileSync('yarn', ['workspaces', 'list', '--json'], {cwd: ROOT, encoding: 'utf8'})
    .trim()
    .split('\n')
    .map((line) => JSON.parse(line));
  fs.mkdirSync(directory, {recursive: true});
  const manifest = workspaces
    .filter(({name}) => NAME.test(name))
    .map(({name, location}) => {
      const file = `${name.slice(1).replace('/', '-')}.tgz`;
      execFileSync('yarn', ['workspace', name, 'pack', '--out', path.join(directory, file)], {
        cwd: ROOT,
        stdio: 'inherit',
      });
      const {version} = JSON.parse(fs.readFileSync(path.join(ROOT, location, 'package.json'), 'utf8'));
      return {name, version, file, sha256: hash(path.join(directory, file))};
    });
  fs.writeFileSync(path.join(directory, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  readCandidates(directory);
}

function readCandidates(directory) {
  const manifest = JSON.parse(fs.readFileSync(path.join(directory, 'manifest.json'), 'utf8'));
  if (!Array.isArray(manifest) || !manifest.length) throw new Error('Candidate manifest must contain packages.');
  const names = new Set();
  const files = new Set();
  for (const entry of manifest) {
    if (
      !NAME.test(entry.name) ||
      typeof entry.version !== 'string' ||
      !entry.version ||
      !/^[a-z-]+\.tgz$/.test(entry.file) ||
      !/^[a-f0-9]{64}$/.test(entry.sha256) ||
      names.has(entry.name) ||
      files.has(entry.file)
    ) {
      throw new Error('Invalid candidate manifest entry.');
    }
    names.add(entry.name);
    files.add(entry.file);
    const filename = path.join(directory, entry.file);
    if (hash(filename) !== entry.sha256) throw new Error(`Candidate hash mismatch: ${entry.name}`);
    const packed = JSON.parse(execFileSync('tar', ['-xOf', filename, 'package/package.json'], {encoding: 'utf8'}));
    if (packed.name !== entry.name || packed.version !== entry.version) {
      throw new Error(`Candidate identity mismatch: ${entry.name}`);
    }
  }
  return manifest;
}

module.exports = {CANDIDATES, packCandidates, readCandidates};

if (require.main === module) {
  try {
    const [command] = process.argv.slice(2);
    if (command === 'pack') packCandidates();
    else if (command === 'verify') readCandidates(CANDIDATES);
    else throw new Error('Use pack or verify.');
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
