import babel from 'rollup-plugin-babel';
import resolve from 'rollup-plugin-node-resolve';
import commonJS from 'rollup-plugin-commonjs';
import json from 'rollup-plugin-json';
import postcss from 'rollup-plugin-postcss';
import builtins from 'rollup-plugin-node-builtins';
import globals from 'rollup-plugin-node-globals';
import url from 'postcss-url';
import react from 'react';
import reactDom from 'react-dom';
import propTypes from 'prop-types';

const output = (name, format) => ({
  name,
  file: `build.cdn/webexWidgets.js`,
  format,
  sourcemap: true,
});

export default [
  {
    input: 'src/index.js',
    output: [output('WebexWidgets', 'umd')],
    plugins: [
      globals(),
      builtins(),
      resolve({
        preferBuiltins: true,
        extensions: ['.js', '.jsx'],
      }),
      commonJS({
        include: /node_modules/,
        namedExports: {
          react: Object.keys(react),
          'react-dom': Object.keys(reactDom),
          'prop-types': Object.keys(propTypes),
        },
      }),
      babel({
        compact: false,
        runtimeHelpers: true,
        exclude: 'node_modules/**'
      }),
      json(),
      postcss({
        extract: 'webexWidgets.css',
        minimize: true,
        plugins: [
          url({
            url: 'copy',
            assetsPath: 'assets/',
            useHash: true,
          }),
        ],
        // to is required by the postcss-url plugin to
        // properly resolve assets path
        to: 'build.cdn/webexWidgets.css',
      }),
    ],
    onwarn(warning, warn) {
      // skip circular dependency warnings from @momentum-ui/react library
      if (warning.code === 'CIRCULAR_DEPENDENCY') return;

      // Use default for everything else
      warn(warning);
    },
    context: null,
  },
];
