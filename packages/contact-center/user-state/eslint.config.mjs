import globals from 'globals';
import pluginJs from '@eslint/js';
import tseslint from 'typescript-eslint';
import pluginReact from 'eslint-plugin-react';

/** @type {import('eslint').Linter.FlatConfig[]} */
export default [
  {files: ['**/src/**/*.{js,mjs,cjs,ts,jsx,tsx}']},
  {ignores: ['.babelrc.js', '*config.{js,ts}', 'dist', 'node_modules', 'coverage']},
  {languageOptions: {globals: globals.browser}},
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  {
    ...pluginReact.configs.flat.recommended,
    settings: {
      react: {
        version: 'detect', // Automatically detect the React version
      },
    },
  },
];
