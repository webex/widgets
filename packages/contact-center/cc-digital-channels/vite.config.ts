import {createViteConfig} from '../../../tooling/vite/base.config';

// https://vitejs.dev/config/
export default createViteConfig({
  entry: 'src/index.ts',
  libName: 'MinimalWebexEngageApp',
  port: 3241,
  external: ['react', 'react-dom', '@webex-engage/wxengage-conversations', 'react/jsx-runtime', '@webex/cc-store'],
  globals: {
    react: 'React',
    'react-dom': 'ReactDOM',
    'react/jsx-runtime': 'React',
    '@webex-engage/wxengage-conversations': 'WebexEngage',
  },
});
