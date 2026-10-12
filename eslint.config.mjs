// Lint rules = machine version of ai/ai_rule.md. `npm run lint` auto-fixes what it can.
import js from '@eslint/js';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import tseslint from 'typescript-eslint';

const UTILITY_TYPES = 'Partial|Required|Readonly|Pick|Omit';
const BANNED_TYPES = 'Record|Exclude|Extract|Awaited|ReturnType|NonNullable|Parameters|InstanceType';

const SHARED_SYNTAX_RULES = [
  { selector: 'IfStatement[alternate]', message: 'else is forbidden: use early return.' },
  { selector: 'ExportDefaultDeclaration', message: 'Default export is forbidden: use named export.' },
  { selector: "CallExpression[callee.property.name='then']", message: 'Use async/await, not .then().' },
  { selector: 'SwitchStatement[cases.length>10]', message: 'More than 10 cases: use Map or a strategy file.' },
  { selector: 'TSInterfaceDeclaration', message: 'interface is forbidden: use type.' },
  { selector: 'TSIntersectionType', message: 'Intersection types are forbidden: declare an explicit type.' },
  { selector: 'TSConditionalType', message: 'Conditional types are forbidden.' },
  { selector: 'TSMappedType', message: 'Mapped types are forbidden.' },
  { selector: 'TSTemplateLiteralType', message: 'Template literal types are forbidden.' },
  {
    selector: `TSTypeReference[typeName.name=/^(${BANNED_TYPES})$/]`,
    message: 'This utility type is forbidden: declare an explicit type.',
  },
  {
    selector: `TSTypeReference[typeName.name=/^(${UTILITY_TYPES})$/] TSTypeReference[typeName.name=/^(${UTILITY_TYPES})$/]`,
    message: 'Only one utility type layer is allowed.',
  },
];

const ENV_SYNTAX_RULE = {
  selector: "MemberExpression[object.name='process'][property.name='env']",
  message: 'Read env only in src/config (envConfig).',
};

export default tseslint.config(
  { ignores: ['dist/**', 'node_modules/**', 'eslint.config.mjs'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.ts'],
    plugins: { 'simple-import-sort': simpleImportSort },
    rules: {
      // Size and complexity
      'max-lines': ['error', { max: 250, skipBlankLines: true, skipComments: true }],
      'max-params': ['error', 3],
      'max-depth': ['error', 3],
      complexity: ['error', { max: 5, variant: 'modified' }],
      'max-classes-per-file': ['error', 1],

      // Branching style: no else, early return, one-line guards
      'no-else-return': 'error',
      curly: ['error', 'multi-line'],
      'no-nested-ternary': 'error',

      // Names
      camelcase: 'error',
      'id-denylist': ['error', 'handler', 'handle', 'process', 'data', 'temp'],

      // Async and errors
      'no-empty': 'error',
      'no-console': 'error',
      'no-restricted-syntax': ['error', ...SHARED_SYNTAX_RULES, ENV_SYNTAX_RULE],
      'no-restricted-imports': [
        'error',
        { patterns: [{ group: ['../*', './*/../*'], message: 'Use the @/ alias instead of ../ imports.' }] },
      ],

      // TypeScript
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/explicit-module-boundary-types': 'error',
      '@typescript-eslint/consistent-type-definitions': ['error', 'type'],
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-unused-vars': 'error',

      // Imports: packages, then types, then local modules; blank line between groups
      'simple-import-sort/imports': [
        'error',
        { groups: [['^node:', '^@?\\w'], ['^.*\\u0000$'], ['^@/', '^\\.']] },
      ],
      'simple-import-sort/exports': 'error',
    },
  },
  {
    // The only place allowed to read process.env
    files: ['src/config/**/*.ts'],
    rules: {
      'id-denylist': ['error', 'handler', 'handle', 'data', 'temp'],
      'no-restricted-syntax': ['error', ...SHARED_SYNTAX_RULES],
    },
  },
);
