const BUNDLERS = ['webpack', 'vite', 'parcel', 'rollup', 'esbuild'];

function enabledBundlers(config = require('./config.json')) {
  if (
    !config ||
    Object.keys(config).length !== BUNDLERS.length ||
    BUNDLERS.some((name) => typeof config[name]?.enabled !== 'boolean')
  ) {
    throw new Error('Each supported bundler must have a boolean enabled flag in config.json.');
  }
  const enabled = BUNDLERS.filter((name) => config[name].enabled);
  if (!enabled.length) throw new Error('At least one consumer bundler must be enabled.');
  return enabled;
}

module.exports = {BUNDLERS, enabledBundlers};

if (require.main === module) console.log(JSON.stringify(enabledBundlers()));
