import babel from 'rollup-plugin-babel';
import resolve from 'rollup-plugin-node-resolve';
import commonJS from 'rollup-plugin-commonjs';
import json from 'rollup-plugin-json';
import postcss from 'rollup-plugin-postcss';
import url from 'postcss-url';

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
      resolve({
        preferBuiltins: true,
        extensions: ['.js', '.jsx'],
      }),
      babel({
        compact: false,
        runtimeHelpers: true,
        babelrc: true,
      }),
      commonJS(),
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
        to: 'dist/webexWidgets.css',
      }),
    ],
    onwarn(warning, warn) {
      // skip circular dependency warnings from @momentum-ui/react library
      if (warning.code === 'CIRCULAR_DEPENDENCY') return;

      // Use default for everything else
      warn(warning);
    },
    external: ['prop-types', 'react', 'react-dom', 'webex', '@webex/common'],
    context: null,
  },
];
