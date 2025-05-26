module.exports = {
  presets: [
    ['@babel/preset-env', {targets: {node: 'current'}, modules: 'commonjs'}], // Transform to CommonJS
    ['@babel/preset-react', {runtime: 'automatic'}],
    '@babel/preset-typescript',
  ],
  plugins: [
    '@babel/plugin-transform-runtime', // Optional: For optimized helpers
  ],
};
