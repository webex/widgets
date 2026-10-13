const fs = require('node:fs');
const path = require('node:path');
const {createHash} = require('node:crypto');
const {execFileSync} = require('node:child_process');

const ROOT = path.resolve(__dirname, '../..');
const CANDIDATES = path.join(ROOT, '.generated/consumer-builds/candidates');
const NAME = /^@webex\/(?:cc-[a-z-]+|widgets)$/;
const hash = (filename) => createHash('sha256').update(fs.readFileSync(filename)).digest('hex');

function selectPackages(workspaces, changed) {
  if (!Array.isArray(changed) || changed.some((name) => !workspaces.some((entry) => entry.name === name))) {
    throw new Error('Changed packages must name existing workspaces.');
  }
  return workspaces
    .filter((entry) => NAME.test(entry.name) && (entry.name.startsWith('@webex/cc-') || changed.includes(entry.name)))
    .map((entry) => ({...entry, publish: changed.includes(entry.name)}));
}

function packCandidates(directory = CANDIDATES, changed = []) {
  const workspaces = execFileSync('yarn', ['workspaces', 'list', '--json'], {cwd: ROOT, encoding: 'utf8'})
    .trim()
    .split('\n')
    .map((line) => JSON.parse(line));
  fs.mkdirSync(directory, {recursive: true});
  const manifest = selectPackages(workspaces, changed).map(({name, location, publish}) => {
    const file = `${name.slice(1).replace('/', '-')}.tgz`;
    execFileSync('yarn', ['workspace', name, 'pack', '--out', path.join(directory, file)], {
      cwd: ROOT,
      stdio: 'inherit',
    });
    const {version} = JSON.parse(fs.readFileSync(path.join(ROOT, location, 'package.json'), 'utf8'));
    return {name, version, file, sha256: hash(path.join(directory, file)), publish};
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
      typeof entry.publish !== 'boolean' ||
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

function publishCandidates(directory, tag, dryRun = false) {
  if (!/^[a-z][a-z0-9-]*$/.test(tag)) throw new Error('Invalid npm dist tag.');
  const manifest = readCandidates(directory);
  for (const entry of manifest.filter((item) => item.publish)) {
    execFileSync(
      'npm',
      [
        'publish',
        path.join(directory, entry.file),
        '--access',
        'public',
        '--tag',
        tag,
        '--registry',
        'https://registry.npmjs.org',
        '--ignore-scripts',
        ...(dryRun ? ['--dry-run'] : []),
      ],
      {cwd: ROOT, stdio: 'inherit'}
    );
  }
}

module.exports = {CANDIDATES, selectPackages, packCandidates, readCandidates, publishCandidates};

if (require.main === module) {
  try {
    const [command, tag, flag] = process.argv.slice(2);
    if (command === 'pack') packCandidates(CANDIDATES, JSON.parse(process.env.CHANGED_PACKAGES || '[]'));
    else if (command === 'publish') publishCandidates(CANDIDATES, tag, flag === '--dry-run');
    else throw new Error('Use pack or publish <tag> [--dry-run].');
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
