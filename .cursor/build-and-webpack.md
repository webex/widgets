# Build System & Webpack Configuration

## Build System Overview

The repository uses **Webpack 5** with **TypeScript** and **Babel** for building packages.

- **Bundler**: Webpack 5.94.0+
- **TypeScript**: ts-loader for compilation
- **Babel**: babel-loader for transpilation
- **Styles**: sass-loader + css-loader + style-loader
- **Output**: UMD bundles for browser and Node.js

## Build Targets

Each package generates:

1. **React Components Bundle** (`dist/index.js`)

   - Entry: `src/index.ts`
   - Exports all React components
   - Type definitions: `dist/types/index.d.ts`

2. **Web Components Bundle** (`dist/wc.js`)

   - Entry: `src/wc.ts`
   - Web Components wrapped with r2wc
   - Type definitions: `dist/types/wc.d.ts`

3. **Type Declarations** (`dist/types/`)
   - Generated TypeScript declaration files
   - Mirrors source structure

## Webpack Configuration

### Base Configuration (`webpack.config.js`)

```javascript
const webpack = require('webpack');
const path = require('path');

module.exports = {
  mode: process.env.NODE_ENV || 'development',

  entry: {
    index: './src/index.ts',
    wc: './src/wc.ts',
  },

  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
    library: {
      type: 'umd',
      name: 'WebexCCWidgets',
    },
    globalObject: 'this',
  },

  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx', '.scss'],
    fallback: {
      fs: false,
      process: require.resolve('process/browser'),
      crypto: require.resolve('crypto-browserify'),
      stream: require.resolve('stream-browserify'),
      // ... more polyfills
    },
  },

  externals: {
    react: 'react',
    'react-dom': 'react-dom',
    '@webex/cc-store': '@webex/cc-store',
    '@momentum-ui/react-collaboration': '@momentum-ui/react-collaboration',
  },

  module: {
    rules: [
      // TypeScript
      {
        test: /\.(ts|tsx)$/,
        exclude: /node_modules/,
        use: 'ts-loader',
      },
      // JavaScript (Babel)
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: 'babel-loader',
      },
      // SCSS
      {
        test: /\.scss$/,
        use: ['style-loader', 'css-loader', 'sass-loader'],
        exclude: /node_modules/,
      },
      // CSS
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
      // Assets (fonts, images)
      {
        test: /\.(woff|woff2|eot|ttf|otf|png|jpg|svg)$/,
        type: 'asset/resource',
      },
    ],
  },

  plugins: [
    new webpack.ProvidePlugin({
      process: 'process/browser',
    }),
  ],

  stats: {
    warningsFilter: [/sass-loader/], // Suppress Sass deprecation warnings
  },
};
```

### Key Configuration Sections

#### Entry Points

```javascript
entry: {
  index: './src/index.ts',      // React components
  wc: './src/wc.ts',            // Web components
}
```

#### Output Configuration

```javascript
output: {
  path: path.resolve(__dirname, 'dist'),
  filename: '[name].js',
  library: {
    type: 'umd',                // Universal Module Definition
    name: 'WebexCCWidgets',
  },
  globalObject: 'this',
}
```

**Output Files**:

- `dist/index.js` - React components bundle
- `dist/wc.js` - Web components bundle

#### Resolve Configuration

```javascript
resolve: {
  extensions: ['.ts', '.tsx', '.js', '.jsx', '.scss'],
  fallback: {
    // Browser polyfills for Node.js modules
    crypto: require.resolve('crypto-browserify'),
    stream: require.resolve('stream-browserify'),
    process: require.resolve('process/browser'),
    os: require.resolve('os-browserify/browser'),
    vm: require.resolve('vm-browserify'),
    util: require.resolve('util/'),
    url: require.resolve('url/'),
    querystring: require.resolve('querystring-es3'),
  },
}
```

#### Externals (Peer Dependencies)

```javascript
externals: {
  'react': 'react',
  'react-dom': 'react-dom',
  '@webex/cc-store': '@webex/cc-store',
  '@momentum-ui/react-collaboration': '@momentum-ui/react-collaboration',
}
```

These are NOT bundled - consumers must provide them.

## Loaders

### TypeScript Loader

```javascript
{
  test: /\.(ts|tsx)$/,
  exclude: /node_modules/,
  use: 'ts-loader',
}
```

Compiles TypeScript to JavaScript using `tsconfig.json`.

### Babel Loader

```javascript
{
  test: /\.(js|jsx)$/,
  exclude: /node_modules/,
  use: 'babel-loader',
}
```

Transpiles modern JavaScript/JSX using `babel.config.js`.

### SCSS Loader Chain

```javascript
{
  test: /\.scss$/,
  use: [
    'style-loader',    // 3. Injects styles into DOM
    'css-loader',      // 2. Turns CSS into CommonJS
    'sass-loader',     // 1. Compiles Sass to CSS
  ],
}
```

**Flow**: SCSS → CSS → JavaScript → DOM `<style>` tags

### Asset Loader

```javascript
{
  test: /\.(woff|woff2|eot|ttf|otf|png|jpg|svg)$/,
  type: 'asset/resource',
}
```

Handles fonts, images, and other assets.

## TypeScript Configuration

### Root `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES6",
    "module": "commonjs",
    "lib": ["ESNext", "DOM"],
    "jsx": "react",
    "declaration": true,
    "outDir": "./dist",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "allowSyntheticDefaultImports": true
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

### Package-Level `tsconfig.json`

Each package can override root config:

```json
{
  "extends": "../../../tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist/types",
    "declarationDir": "./dist/types"
  },
  "include": ["src/**/*"],
  "exclude": ["src/**/*.test.ts", "src/**/*.spec.ts"]
}
```

## Babel Configuration

### Root `babel.config.js`

```javascript
module.exports = {
  presets: [
    [
      '@babel/preset-env',
      {
        targets: {
          browsers: ['last 2 versions', 'ie >= 11'],
        },
      },
    ],
    '@babel/preset-react',
    '@babel/preset-typescript',
  ],
  plugins: ['@babel/plugin-proposal-class-properties', '@babel/plugin-proposal-object-rest-spread'],
};
```

## Build Scripts

### Package.json Scripts

```json
{
  "scripts": {
    "clean": "rm -rf dist && rm -rf node_modules",
    "clean:dist": "rm -rf dist",
    "build:src": "yarn run clean:dist && webpack",
    "build:watch": "webpack --watch",
    "build": "yarn run -T tsc"
  }
}
```

### Build Commands

```bash
# Clean and build
yarn workspace @webex/cc-components run build:src

# Watch mode (rebuild on changes)
yarn workspace @webex/cc-components run build:watch

# TypeScript only (no webpack)
yarn workspace @webex/cc-components run build
```

## Build Modes

### Development Mode

```bash
NODE_ENV=development yarn run build:dev
```

Features:

- Source maps enabled
- No minification
- Faster builds
- Detailed error messages

### Production Mode

```bash
NODE_ENV=production yarn run build:prod
```

Features:

- Minification enabled
- Tree shaking
- Optimized bundles
- Smaller file sizes

## Build Output

### Example Output Structure

```
dist/
├── index.js              # React components bundle
├── wc.js                 # Web components bundle
├── types/                # TypeScript declarations
│   ├── index.d.ts
│   ├── wc.d.ts
│   └── components/
│       ├── ComponentName/
│       │   ├── component-name.d.ts
│       │   ├── component-name.types.d.ts
│       │   └── component-name.utils.d.ts
│       └── ...
└── assets/               # Fonts, images (if any)
    ├── fonts/
    └── images/
```

## Webpack Plugins

### Provide Plugin

```javascript
new webpack.ProvidePlugin({
  process: 'process/browser',
  Buffer: ['buffer', 'Buffer'],
});
```

Makes Node.js globals available in browser.

### Define Plugin (Optional)

```javascript
new webpack.DefinePlugin({
  'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
  'process.env.VERSION': JSON.stringify(require('./package.json').version),
});
```

### HTML Webpack Plugin (Sample Apps)

```javascript
new HtmlWebpackPlugin({
  template: './public/index.html',
  inject: true,
});
```

## Optimization

### Production Optimizations

```javascript
optimization: {
  minimize: true,
  minimizer: [
    new TerserPlugin({
      terserOptions: {
        compress: {
          drop_console: true,  // Remove console.logs
        },
      },
    }),
  ],
  splitChunks: {
    chunks: 'all',
    cacheGroups: {
      vendors: {
        test: /[\\/]node_modules[\\/]/,
        priority: -10,
      },
    },
  },
}
```

### Bundle Analysis

```bash
yarn workspace @webex/cc-components run build:src -- --analyze
```

Generates interactive bundle size analysis.

## Common Build Issues

### Issue: "Cannot resolve module"

**Cause**: Missing dependency or incorrect path

**Solution**:

```bash
yarn install
yarn workspace @webex/cc-store run build:src  # Build dependencies first
```

### Issue: "Module not found: Error: Can't resolve 'fs'"

**Cause**: Node.js module used in browser code

**Solution**: Add to `resolve.fallback`:

```javascript
resolve: {
  fallback: {
    fs: false,  // fs cannot be used in browser
  }
}
```

### Issue: Sass deprecation warnings

**Cause**: sass-loader using deprecated Sass features

**Solution**: Suppress in webpack config:

```javascript
stats: {
  warningsFilter: [/sass-loader/],
}
```

### Issue: Build very slow

**Causes**:

- Large number of modules
- No caching
- Development mode overhead

**Solutions**:

```javascript
// Enable caching
cache: {
  type: 'filesystem',
},

// Limit source map generation
devtool: 'eval-source-map',  // Faster than 'source-map'
```

### Issue: Out of memory during build

**Solution**:

```bash
NODE_OPTIONS=--max-old-space-size=4096 yarn run build
```

## Advanced Configuration

### Code Splitting

```javascript
optimization: {
  splitChunks: {
    chunks: 'all',
    maxSize: 244000,  // 244kb
    cacheGroups: {
      vendors: {
        test: /[\\/]node_modules[\\/]/,
        name: 'vendors',
      },
      default: {
        minChunks: 2,
        priority: -20,
        reuseExistingChunk: true,
      },
    },
  },
}
```

### Dynamic Imports

```typescript
// Lazy load component
const HeavyComponent = React.lazy(() => import('./HeavyComponent'));

<Suspense fallback={<Loading />}>
  <HeavyComponent />
</Suspense>
```

### Environment-Specific Builds

```javascript
// webpack.config.js
const isDev = process.env.NODE_ENV === 'development';

module.exports = {
  mode: isDev ? 'development' : 'production',
  devtool: isDev ? 'eval-source-map' : 'source-map',
  optimization: {
    minimize: !isDev,
  },
};
```

## Build Performance Tips

### 1. Use Webpack Cache

```javascript
cache: {
  type: 'filesystem',
  buildDependencies: {
    config: [__filename],
  },
}
```

### 2. Parallel Builds

```bash
# Build all packages in parallel
yarn run build:dev
```

### 3. Incremental Builds

```bash
# Use watch mode for active development
yarn workspace @webex/cc-components run build:watch
```

### 4. Exclude Unnecessary Files

```javascript
module: {
  rules: [
    {
      test: /\.(ts|tsx)$/,
      exclude: [
        /node_modules/,
        /tests/,
        /\.(test|spec)\.(ts|tsx)$/,
      ],
      use: 'ts-loader',
    },
  ],
}
```

## Debugging Webpack

### Verbose Output

```bash
yarn workspace @webex/cc-components run build:src -- --verbose
```

### Build Stats

```bash
yarn workspace @webex/cc-components run build:src -- --json > stats.json
```

Analyze with: https://webpack.github.io/analyse/

### Profile Build

```bash
yarn workspace @webex/cc-components run build:src -- --profile
```

## Next Steps

- See `development-workflow.md` for build commands
- See `troubleshooting.md` for build issues
- See `component-patterns.md` for component structure
