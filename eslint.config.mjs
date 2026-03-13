import tseslint from '@typescript-eslint/eslint-plugin'
import importPlugin from 'eslint-plugin-import'
import prettier from 'eslint-config-prettier'

const ignores = [
  '**/dist/**',
  '**/build/**',
  '**/coverage/**',
  '**/.next/**',
  '**/node_modules/**',
  '**/.turbo/**',
]

export default [
  {
    ignores,
    linterOptions: {
      reportUnusedDisableDirectives: 'error',
    },
  },
  ...tseslint.configs['flat/recommended'],
  {
    files: ['**/*.{ts,tsx,mts,cts}'],
    plugins: {
      import: importPlugin,
    },
    settings: {
      'import/parsers': {
        '@typescript-eslint/parser': ['.ts', '.tsx', '.mts', '.cts'],
      },
    },
    rules: {
      ...prettier.rules,
      'import/order': [
        'error',
        {
          alphabetize: {
            order: 'asc',
            caseInsensitive: true,
          },
          'newlines-between': 'always',
        },
      ],
      'import/no-unresolved': 'off',
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
    },
  },
  {
    files: ['**/*.{test,spec}.ts'],
    rules: {
      '@typescript-eslint/consistent-type-imports': 'off',
    },
  },
  {
    files: ['**/*.d.ts'],
    rules: {
      '@typescript-eslint/no-namespace': 'off',
    },
  },
]
