import babel from 'rollup-plugin-babel';
import resolve from 'rollup-plugin-node-resolve';
import commonJS from 'rollup-plugin-commonjs';

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
      }),
      commonJS(),
    ],
    external: ['prop-types', 'react', 'react-dom', 'webex', '@webex/common'],
  },
];
9;
