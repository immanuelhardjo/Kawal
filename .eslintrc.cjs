/* eslint-env node */
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint', 'kawal'],
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
  ignorePatterns: ['dist/**', 'node_modules/**', 'coverage/**', '*.cjs', '*.config.*'],
  rules: {
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
    // Kawal-specific: forbid raw rendering of fact-bearing payloads
    // (enforced in apps/web via plugin:kawal/no-raw-fact-render below)
    'kawal/no-raw-fact-render': 'off',
    'kawal/no-editorial-tone': 'off',
    'kawal/no-bahasa-in-identifiers': 'off',
  },
  overrides: [
    {
      files: ['apps/web/**/*.{ts,tsx}'],
      plugins: ['react', 'react-hooks', 'kawal'],
      extends: ['plugin:react/recommended', 'plugin:react-hooks/recommended'],
      rules: {
        'react/react-in-jsx-scope': 'off',
        'react/prop-types': 'off',
        // Enforce certainty/source primitives over raw rendering of dossier payloads
        'kawal/no-raw-fact-render': 'error',
        'kawal/no-editorial-tone': 'error',
      },
      settings: { react: { version: 'detect' } },
    },
    {
      files: ['apps/api/**/*.ts', 'packages/**/*.ts'],
      rules: {
        'kawal/no-bahasa-in-identifiers': 'error',
      },
    },
    {
      files: ['apps/web/src/i18n/**/*.{ts,json}', '**/*.bahasa.ts'],
      rules: {
        'kawal/no-editorial-tone': 'error',
        'kawal/no-bahasa-in-identifiers': 'off',
      },
    },
  ],
};
