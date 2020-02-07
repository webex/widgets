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
    bufferutil: 'bufferutil',
    'prop-types': 'PropTypes',
    react: 'React',
    'react-dom': 'ReactDOM',
    'spawn-sync': 'spawnSync',
    'utf-8-validate': 'utf8Validate',
  },
});

export default [
  {
    input: 'src/index.js',
    output: [output('webexWidgets', 'cjs'), output('UMDWebexWidgets', 'umd'), output('ESMWebexWidgets', 'esm')],
    plugins: [
      resolve({
        preferBuiltins: true,
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
    external: ['bufferutil', 'prop-types', 'react', 'react-dom', 'spawn-sync', 'utf-8-validate'],
    context: 'null',
  },
];
