const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {spawnSync} = require('node:child_process');
const YAML = require('yaml');
const {BUNDLERS} = require('../consumer-builds/config.cjs');

const workflow = (name) => YAML.parse(fs.readFileSync(path.join(__dirname, '../../.github/workflows', name), 'utf8'));
const steps = [
  ['PR', workflow('consumer-builds.yml').jobs.prepare.steps],
  ['release', workflow('deploy.yml').jobs['prepare-release'].steps],
].map(([name, entries]) => [name, entries.find((entry) => entry.id === 'config').run]);

describe.each(steps)('%s workflow configuration step', (_name, script) => {
  let directory;
  let output;
  const config = () => Object.fromEntries(BUNDLERS.map((name) => [name, {enabled: true}]));
  const run = (value) => {
    fs.writeFileSync(path.join(directory, 'tooling/consumer-builds/config.json'), JSON.stringify(value));
    return spawnSync('bash', ['-e', '-c', script], {
      cwd: directory,
      env: {...process.env, GITHUB_OUTPUT: output},
      encoding: 'utf8',
    });
  };

  beforeEach(() => {
    directory = fs.mkdtempSync(path.join(os.tmpdir(), 'widget-workflow-config-'));
    output = path.join(directory, 'output');
    fs.mkdirSync(path.join(directory, 'tooling/consumer-builds'), {recursive: true});
    fs.copyFileSync(
      path.join(__dirname, '../consumer-builds/config.cjs'),
      path.join(directory, 'tooling/consumer-builds/config.cjs')
    );
  });

  afterEach(() => fs.rmSync(directory, {recursive: true, force: true}));

  it.each([false, true])('writes only the enabled matrix (Parcel disabled: %s)', (disabled) => {
    const value = config();
    value.parcel.enabled = !disabled;
    expect(run(value).status).toBe(0);
    const expected = BUNDLERS.filter((name) => value[name].enabled);
    expect(fs.readFileSync(output, 'utf8')).toBe(`bundlers=${JSON.stringify(expected)}\n`);
  });

  it.each([
    ['a missing configuration', null],
    ['an invalid flag', {...config(), parcel: {enabled: 'false'}}],
    ['all bundlers disabled', Object.fromEntries(BUNDLERS.map((name) => [name, {enabled: false}]))],
  ])('fails before writing an output for %s', (_label, value) => {
    const result = run(value);
    expect(result.status).toBeGreaterThan(0);
    expect(result.stderr).toMatch(/boolean enabled flag|At least one/);
    expect(fs.existsSync(output)).toBe(false);
  });
});
