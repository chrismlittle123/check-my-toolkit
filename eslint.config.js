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

      // Disallow `any` type - error for new code, but existing code may need it
      '@typescript-eslint/no-explicit-any': 'warn',

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
      '@typescript-eslint/no-non-null-assertion': 'warn',

      // Prefer RegExp.exec() over String.match()
      '@typescript-eslint/prefer-regexp-exec': 'warn',

      // Require explicit return types on functions
      '@typescript-eslint/explicit-function-return-type': 'warn',

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
      'no-console': ['warn', { allow: ['error', 'warn'] }],

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
      complexity: ['warn', 10],

      // Max depth of nested blocks - deep nesting is hard to read
      'max-depth': ['warn', 4],

      // Max lines per function - keep functions small and focused
      'max-lines-per-function': [
        'warn',
        {
          max: 50,
          skipBlankLines: true,
          skipComments: true,
        },
      ],

      // Max statements per function - encourages extraction of helper functions
      'max-statements': ['warn', 15],

      // Max parameters per function - too many params suggests need for options object
      'max-params': ['warn', 4],

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

  // Test files configuration - more relaxed
  {
    files: ['tests/**/*.ts'],
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
      // Import sorting for tests too
      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error',
      // Relax some rules for tests
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      'max-lines-per-function': 'off',
      complexity: 'off',
      'no-console': 'off',
      'no-await-in-loop': 'off',
    },
  }
);
