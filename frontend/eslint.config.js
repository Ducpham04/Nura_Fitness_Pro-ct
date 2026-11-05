import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist', 'playwright-report', 'test-results'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        {
          allowConstantExport: true,
          // Context/hook + icon-map modules intentionally co-locate a hook or lookup
          // helper with their component; Fast Refresh falls back to a full reload there.
          allowExportNames: [
            'useAuthContext', 'useTheme',
            'GOAL_ICONS', 'getGoalIcon',
            'premiumEase', 'containerStagger', 'fadeUp', 'fadeScale',
          ],
        },
      ],
      // Prefix with "_" to mark an intentionally unused parameter.
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      // API payloads are still loosely typed in services/AdminPanel — tracked as
      // tech debt; surfaced as warnings so new code is nudged toward real types.
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  }
);
