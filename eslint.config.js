import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';
import simpleImportSort from 'eslint-plugin-simple-import-sort';

export default tseslint.config(
  // Base recommended configs
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  ...tseslint.configs.stylistic,

  // Global ignores
  {
    ignores: [
      'dist/**',
      '**/dist/**',
      'node_modules/**',
      '**/node_modules/**',
      'coverage/**',
      '*.js',
      '*.mjs',
      '*.cjs',
      // Test files - excluded from linting
      'tests/**',
    ],
  },

  // Source files configuration
  {
    files: ['src/**/*.ts'],
    plugins: {
      'simple-import-sort': simpleImportSort,
    },
    languageOptions: {
      globals: {
        ...globals.node,
      },
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // ============================================
      // Import sorting
      // ============================================
      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error',

      // ============================================
      // TypeScript-specific rules
      // ============================================

      // Disallow `any` type
      '@typescript-eslint/no-explicit-any': 'error',

      // Require using `type` imports for types
      '@typescript-eslint/consistent-type-imports': [
        'error',
        {
          prefer: 'type-imports',
          fixStyle: 'inline-type-imports',
        },
      ],

      // Unused variables (allow underscore prefix for intentionally unused)
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],

      // Prefer nullish coalescing
      '@typescript-eslint/prefer-nullish-coalescing': 'warn',

      // Prefer optional chaining
      '@typescript-eslint/prefer-optional-chain': 'error',

      // Use T[] instead of Array<T>
      '@typescript-eslint/array-type': ['error', { default: 'array' }],

      // No non-null assertions (!)
      '@typescript-eslint/no-non-null-assertion': 'error',

      // Prefer RegExp.exec() over String.match()
      '@typescript-eslint/prefer-regexp-exec': 'warn',

      // Require explicit return types on functions
      '@typescript-eslint/explicit-function-return-type': 'error',

      // Promise-related rules (type-aware)
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/await-thenable': 'error',

      // ============================================
      // File and function size limits
      // ============================================

      // Max lines per file - enforces small, focused modules
      'max-lines': [
        'warn',
        {
          max: 400,
          skipBlankLines: true,
          skipComments: true,
        },
      ],

      // ============================================
      // General JavaScript rules
      // ============================================

      // No console in production code (except error and warn)
      'no-console': ['error', { allow: ['error', 'warn'] }],

      // Require curly braces for all control statements
      curly: 'error',

      // No eval
      'no-eval': 'error',
      'no-implied-eval': 'error',

      // Require const for variables that are never reassigned
      'prefer-const': 'error',

      // No var declarations
      'no-var': 'error',

      // Use template literals instead of string concatenation
      'prefer-template': 'warn',

      // Require arrow functions for callbacks
      'prefer-arrow-callback': 'error',

      // Require === and !==
      eqeqeq: ['error', 'always'],

      // No nested ternary
      'no-nested-ternary': 'error',

      // No throwing literals (throw Error objects instead)
      'no-throw-literal': 'error',
      '@typescript-eslint/only-throw-error': 'error',

      // Limit cyclomatic complexity - lower is better for maintainability
      complexity: ['error', 10],

      // Max depth of nested blocks - deep nesting is hard to read
      'max-depth': ['error', 4],

      // Max lines per function - keep functions small and focused
      'max-lines-per-function': [
        'error',
        {
          max: 50,
          skipBlankLines: true,
          skipComments: true,
        },
      ],

      // Max statements per function - encourages extraction of helper functions
      'max-statements': ['error', 15],

      // Max parameters per function - too many params suggests need for options object
      'max-params': ['error', 4],

      // No duplicate imports
      'no-duplicate-imports': 'error',

      // ============================================
      // Code quality rules
      // ============================================

      // Require return statements in array methods
      'array-callback-return': 'error',

      // No await in loops (usually indicates potential optimization)
      'no-await-in-loop': 'warn',

      // No assignments in return statements
      'no-return-assign': 'error',

      // Require rest parameters instead of arguments
      'prefer-rest-params': 'error',

      // Require spread instead of .apply()
      'prefer-spread': 'error',
    },
  },

);
