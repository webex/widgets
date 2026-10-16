const fs = require('fs');
const path = require('path');
const webpack = require('webpack');
const config = require('../../packages/contact-center/ai-assistant/webpack.config');

const sourceRoot = path.resolve(__dirname, '../../packages/contact-center/ai-assistant/src/wellness/assets');
const sourceFiles = [
  'media.cjs',
  'WellnessBreakSound.mp3',
  'WellnessBreakAnimationDark.json',
  'WellnessBreakAnimationLight.json',
];

const emitMedia = () => {
  const assets = new Map();
  const fileDependencies = new Set();
  const compilation = {
    fileDependencies,
    emitAsset: (filename, source) => assets.set(filename, source.buffer()),
    hooks: {processAssets: {tap: (_options, callback) => callback()}},
  };
  const compiler = {
    webpack: {sources: webpack.sources, Compilation: {PROCESS_ASSETS_STAGE_ADDITIONS: 0}},
    hooks: {thisCompilation: {tap: (_name, callback) => callback(compilation)}},
  };
  config.plugins.find((plugin) => plugin.constructor.name === 'EmitWellnessAssetsPlugin').apply(compiler);
  return {assets, fileDependencies};
};

const readExport = (assets, filename) => {
  const source = assets.get(`assets/wellness/${filename}`).toString('utf8');
  expect(source.startsWith('export default ')).toBe(true);
  return JSON.parse(source.slice('export default '.length, -2));
};

describe('wellness media packaging', () => {
  let emitted;
  beforeAll(() => {
    emitted = emitMedia();
  });

  it('emits all portable modules and removes the inline Webpack loader', () => {
    expect([...emitted.assets.keys()].sort()).toEqual(
      [...sourceFiles, 'WellnessBreakSound.mjs', 'WellnessBreakAnimationDark.mjs', 'WellnessBreakAnimationLight.mjs']
        .map((filename) => `assets/wellness/${filename}`)
        .sort()
    );
    expect(emitted.assets.has('assets/wellness/emit-wellness-asset.cjs')).toBe(false);
  });

  it.each(sourceFiles)('retains the original bytes of %s', (filename) => {
    expect(emitted.assets.get(`assets/wellness/${filename}`)).toEqual(fs.readFileSync(path.join(sourceRoot, filename)));
  });

  it('exports an audio data URL containing the original MP3', () => {
    const url = readExport(emitted.assets, 'WellnessBreakSound.mjs');
    expect(url.startsWith('data:audio/mpeg;base64,')).toBe(true);
    expect(Buffer.from(url.slice(url.indexOf(',') + 1), 'base64')).toEqual(
      fs.readFileSync(path.join(sourceRoot, 'WellnessBreakSound.mp3'))
    );
  });

  it.each(['Dark', 'Light'])('exports the original %s animation as JavaScript data', (theme) => {
    expect(readExport(emitted.assets, `WellnessBreakAnimation${theme}.mjs`)).toEqual(
      JSON.parse(fs.readFileSync(path.join(sourceRoot, `WellnessBreakAnimation${theme}.json`), 'utf8'))
    );
  });

  it('uses standard imports without a consumer MP3 or JSON loader', () => {
    const loader = emitted.assets.get('assets/wellness/media.cjs').toString('utf8');
    expect(loader).not.toMatch(/require\.ensure|__webpack_public_path__|emit-wellness-asset|!!\./);
    expect(loader).not.toMatch(/(?:import|require)\([^)]*\.(?:mp3|json)/);
    const imports = [...loader.matchAll(/import\('\.\/([^']+)'\)/g)].map((match) => match[1]);
    expect(imports.sort()).toEqual(
      ['WellnessBreakSound.mjs', 'WellnessBreakAnimationDark.mjs', 'WellnessBreakAnimationLight.mjs'].sort()
    );
    imports.forEach((filename) => expect(emitted.assets.has(`assets/wellness/${filename}`)).toBe(true));
  });

  it('tracks the original media files for watch builds', () => {
    expect([...emitted.fileDependencies].sort()).toEqual(
      sourceFiles.map((filename) => path.join(sourceRoot, filename)).sort()
    );
  });

  it('regenerates the audio module when the source bytes change', () => {
    const readFile = fs.readFileSync;
    const changedAudio = Buffer.from('changed audio bytes');
    const readSpy = jest
      .spyOn(fs, 'readFileSync')
      .mockImplementation((filename, ...options) =>
        filename === path.join(sourceRoot, 'WellnessBreakSound.mp3') ? changedAudio : readFile(filename, ...options)
      );
    try {
      const updated = emitMedia();
      expect(readExport(updated.assets, 'WellnessBreakSound.mjs')).toBe(
        `data:audio/mpeg;base64,${changedAudio.toString('base64')}`
      );
      expect(updated.assets.get('assets/wellness/WellnessBreakSound.mp3')).toEqual(changedAudio);
    } finally {
      readSpy.mockRestore();
    }
  });
});
