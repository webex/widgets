const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {execFileSync} = require('node:child_process');
const {CANDIDATES, readCandidates} = require('../consumer-builds/candidates.cjs');

function publishWorkspace(args = [], cwd = process.cwd()) {
  const manifest = JSON.parse(fs.readFileSync(path.join(cwd, 'package.json'), 'utf8'));
  const options = {cwd, stdio: 'inherit'};
  if (manifest.private) throw new Error('Private workspaces cannot be published.');

  if (/^@webex\/cc-[a-z-]+$/.test(manifest.name)) {
    // Publish the same archive that passed the release consumer checks.
    const candidate = readCandidates(CANDIDATES).find((entry) => entry.name === manifest.name);
    if (!candidate || candidate.version !== manifest.version) {
      throw new Error(`No release candidate matches ${manifest.name}@${manifest.version}.`);
    }
    execFileSync('npm', ['publish', path.join(CANDIDATES, candidate.file), ...args], options);
    return;
  }

  if (manifest.name !== '@webex/widgets') throw new Error(`Unsupported release package: ${manifest.name}`);
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'widgets-npm-publish-'));
  try {
    const archive = path.join(directory, 'package.tgz');
    // Keep Yarn's package transforms when npm uploads the archive.
    execFileSync('yarn', ['pack', '--out', archive], options);
    execFileSync('npm', ['publish', archive, ...args], options);
  } finally {
    fs.rmSync(directory, {recursive: true, force: true});
  }
}

module.exports = {publishWorkspace};

if (require.main === module) {
  try {
    publishWorkspace(process.argv.slice(2));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
