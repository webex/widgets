import commonjs from '@rollup/plugin-commonjs';
import {nodeResolve} from '@rollup/plugin-node-resolve';
import postcss from 'rollup-plugin-postcss';
import url from '@rollup/plugin-url';
import json from '@rollup/plugin-json';
import replace from '@rollup/plugin-replace';

export default {
  input: 'src/main.js',
  output: {dir: 'dist/rollup', format: 'esm', entryFileNames: 'main.js'},
  plugins: [
    replace({preventAssignment: true, 'process.env.NODE_ENV': JSON.stringify('production')}),
    nodeResolve({browser: true}),
    postcss({extract: true}),
    url({include: ['**/*.svg', '**/*.png', '**/*.woff', '**/*.woff2', '**/*.ttf', '**/*.eot'], limit: 0}),
    json(),
    commonjs(),
  ],
};
