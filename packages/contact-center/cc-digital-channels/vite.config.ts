import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import dts from 'vite-plugin-dts';
import {resolve} from 'path';

/**
 * Base vite configuration for all vite-based packages
 * This configuration provides common settings and can be extended by individual packages
 */
interface ViteConfigOptions {
  entry?: string;
  libName?: string;
  external?: string[];
  globals?: Record<string, string>;
  port?: number;
  [key: string]: any;
}

export const createViteConfig = (options: ViteConfigOptions = {}) => {
  const {
    entry = 'src/index.ts',
    libName = 'Library',
    external = ['react', 'react-dom'],
    globals = {
      react: 'React',
      'react-dom': 'ReactDOM',
    },
    port = 3000,
    ...overrides
  } = options;

  return defineConfig(({mode}) => {
    const isLib = mode === 'lib';

    return {
      plugins: [react(), ...(isLib ? [dts({tsconfigPath: './tsconfig.json'})] : [])],
      define: {
        global: 'globalThis',
      },
      resolve: {
        alias: {
          buffer: 'buffer',
          process: 'process/browser',
        },
      },
      server: {
        port,
        open: true,
      },
      build: isLib
        ? {
            lib: {
              entry: resolve(process.cwd(), entry),
              name: libName,
              formats: ['umd', 'es'],
              fileName: (format) => `index.${format === 'es' ? 'esm' : format}.js`,
            },
            rollupOptions: {
              external,
              output: [
                {
                  format: 'umd',
                  name: libName,
                  globals,
                },
                {
                  format: 'es',
                  exports: 'named',
                },
              ],
            },
            outDir: 'dist',
            sourcemap: true,
            minify: false,
          }
        : {
            outDir: 'dist',
            sourcemap: true,
          },
      ...overrides,
    };
  });
};

// https://vitejs.dev/config/
export default createViteConfig({
  entry: 'src/index.ts',
  libName: 'MinimalWebexEngageApp',
  port: 3241,
  external: ['react', 'react-dom', 'react/jsx-runtime', '@webex/cc-store'],
  globals: {
    react: 'React',
    'react-dom': 'ReactDOM',
    'react/jsx-runtime': 'React',
  },
});
