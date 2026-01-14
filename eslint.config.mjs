import antfu from '@antfu/eslint-config'
import autoImports from './.wxt/eslint-auto-imports.mjs'

export default antfu(
  {
    react: true,
    typescript: true,
  },
  autoImports,
  {
    ignores: ['.wxt/', '.output/', 'dist/', 'node_modules/', 'public/', 'docs/'],
  },
  {
    rules: {
      // Allow console.log in development (console.warn/error always allowed)
      'no-console': ['warn', { allow: ['warn', 'error', 'info', 'debug'] }],
      // Allow assignment in while conditions (common iterator pattern)
      'no-cond-assign': ['error', 'except-parens'],
      // Allow functions and variables to be used before defined (common in callback patterns)
      'ts/no-use-before-define': ['error', { functions: false, variables: false }],
      // Allow @ts-ignore when @ts-expect-error would cause "unused directive" TypeScript errors
      'ts/ban-ts-comment': ['error', { 'ts-ignore': 'allow-with-description' }],
      // Markdown files don't need linting
      'markdown/heading-increment': 'off',
      // useContext is more reliable than React 19's use() which requires proper auto-import setup
      'react/no-use-context': 'off',
    },
  },
  // Test files - disable React hooks rules (Playwright fixtures use `use()` which isn't a React hook)
  {
    files: ['tests/**/*.ts', 'tests/**/*.tsx'],
    rules: {
      'react-hooks/rules-of-hooks': 'off',
    },
  },
)
