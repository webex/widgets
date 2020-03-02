import babel from 'rollup-plugin-babel';
import resolve from 'rollup-plugin-node-resolve';
import commonJS from 'rollup-plugin-commonjs';
import json from 'rollup-plugin-json';
import builtins from 'rollup-plugin-node-builtins';

const output = (name, format) => ({
  name,
  file: `dist/webexWidgets.${format}.js`,
  format,
  sourcemap: true,
  globals: {
    'prop-types': 'PropTypes',
    react: 'React',
    'react-dom': 'ReactDOM',
    'spawn-sync': 'spawnSync',
    webex: 'webex',
  },
});

export default [
  {
    input: 'src/index.js',
    output: [output('ESMWebexWidgets', 'esm')],
    plugins: [
      resolve({
        preferBuiltins: true,
        extensions: ['.js', '.jsx'],
      }),
      babel({
        compact: false,
        runtimeHelpers: true,
      }),
      commonJS({
        // TODO: Remove workaround once fixed in SDK
        // explicitly specify unresolvable named exports
        namedExports: {'@webex/common': ['deconstructHydraId']},
      }),
      json(),
      builtins(),
    ],
    onwarn(warning, warn) {
      // skip circular dependency warnings from webex library
      if (warning.code === 'CIRCULAR_DEPENDENCY') return;

      // Use default for everything else
      warn(warning);
    },
    external: ['prop-types', 'react', 'react-dom', 'webex'],
    context: 'null',
  },
];
