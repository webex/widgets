import {build} from 'esbuild';
import {sassPlugin} from 'esbuild-sass-plugin';

await build({
  entryPoints: ['src/main.js'],
  bundle: true,
  platform: 'browser',
  format: 'esm',
  splitting: true,
  minify: true,
  outdir: 'dist/esbuild',
  entryNames: 'main',
  define: {'process.env.NODE_ENV': '"production"'},
  plugins: [sassPlugin()],
  loader: {
    '.woff': 'file',
    '.woff2': 'file',
    '.ttf': 'file',
    '.eot': 'file',
    '.otf': 'file',
    '.svg': 'file',
    '.png': 'file',
    '.jpg': 'file',
  },
});
