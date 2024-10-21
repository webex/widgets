import babel from '@rollup/plugin-babel';
import resolve from '@rollup/plugin-node-resolve';
import commonJS from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import postcss from 'rollup-plugin-postcss';
import url from 'postcss-url';
import replace from '@rollup/plugin-replace';
import {version} from './package.json';

const output = (name, format) => ({
  name,
  file: `dist/webexWidgets.${format}.js`,
  format,
  sourcemap: true,
  globals: {
    'prop-types': 'PropTypes',
    react: 'React',
    'react-dom': 'ReactDOM',
    webex: 'webex',
    '@webex/common': '@webex/common',
  },
});

export default [
  {
    input: 'src/index.js',
    output: [output('ESMWebexWidgets', 'esm')],
    plugins: [
      replace({
        preventAssignment: true,
        include: ['src/widgets/WebexMeetings/WebexMeetings.jsx'],
        values: {
          __appVersion__: JSON.stringify(version),
        },
      }),
      resolve({
        preferBuiltins: true,
        extensions: ['.js', '.jsx'],
      }),
      commonJS(),
      babel({
        compact: false,
        babelHelpers: 'runtime',
        plugins: ['@babel/plugin-transform-runtime'],
        babelrc: true,
      }),
      json(),
      postcss({
        extract: 'css/webex-widgets.css',
        minimize: true,
        plugins: [
          url({
            url: 'copy',
            assetsPath: './assets/',
            useHash: true,
          }),
        ],
        // to is required by the postcss-url plugin to
        // properly resolve assets path
        to: 'dist/css/webex-widgets.css',
      }),
    ],
    external: ['prop-types', 'react', 'react-dom', 'webex', '@webex/common', 'winston'],
    context: null,
  },
];
