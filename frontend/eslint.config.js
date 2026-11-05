import js from '@eslint/js'
import globals from 'globals'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  // storybook-static is the gitignored Storybook build output.
  globalIgnores(['dist', 'storybook-static']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
      jsxA11y.flatConfigs.recommended,
    ],
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      complexity: ['error', 10],
      'no-restricted-syntax': [
        'error',
        {
          selector: 'Program > :not(ImportDeclaration, ExpressionStatement[directive]) ~ ImportDeclaration',
          message: 'Keep imports at the top of the file.',
        },
        {
          selector:
            'ImportDeclaration[source.value=/^([.]|@[\\u002F])/] ~ ImportDeclaration[source.value=/^(?![.]|@[\\u002F])/]',
          message: 'Import packages before local (@/ or relative) modules.',
        },
      ],
    },
  },
  {
    // ADR 0027: shared code imports no slice (campaign-play, scene-play, ...).
    files: ['src/shared/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              // Add a new slice folder here.
              group: [
                '@/campaign-list/**',
                '@/campaign-play/**',
                '@/scenario-preparation/**',
                '@/scene-play/**',
                '@/routes/**',
              ],
              message: 'shared/ must not import a feature slice (ADR 0027). Pass the value in as a prop.',
            },
          ],
        },
      ],
    },
  },
  {
    // ADR 0028: scenario-preparation imports no scene-play (panel bodies live in the subject's slice; hosts adapt).
    files: ['src/scenario-preparation/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/scene-play/**'],
              message: 'scenario-preparation/ must not import scene-play (ADR 0028). Put the shared body in this slice and let the host adapt.',
            },
          ],
        },
      ],
    },
  },
  {
    // Baseline: violations that predate these rules. Shrink this list; do not grow it.
    files: [
      'src/campaign-play/components/attention-list/attention-list.tsx',
      'src/campaign-play/components/characteristics-step/characteristics-step.tsx',
      'src/campaign-play/components/investigator-wizard/investigator-wizard.tsx',
      'src/campaign-play/components/invite-management/invite-management.tsx',
      'src/campaign-play/components/occupation-skills-step/occupation-skills-step.tsx',
      'src/campaign-play/components/occupation-step/occupation-step.tsx',
      'src/campaign-play/components/skill-picker/skill-picker.tsx',
      'src/campaign-play/components/wizard-field/wizard-field.tsx',
      'src/campaign-play/services/characterSheetValidation.test.ts',
      'src/campaign-play/services/skillTableEntries.ts',
    ],
    rules: {
      complexity: 'off',
    },
  },
  {
    files: ['src/campaign-play/components/personal-interests-step/personal-interests-step.tsx'],
    rules: {
      'no-restricted-syntax': 'off',
    },
  },
  {
    // Route modules and shadcn ui primitives intentionally export non-component values.
    files: ['src/routes/**/*.tsx', 'src/shared/components/ui/**/*.tsx'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
])
