import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import importPlugin from 'eslint-plugin-import';
import svelte from 'eslint-plugin-svelte';
import globals from 'globals';
import ts from 'typescript-eslint';
import svelteConfig from './svelte.config.js';

const importSortingRules = {
	'import/order': [
		'error',
		{
			groups: [
				['builtin', 'external'],
				'internal',
				['parent', 'sibling', 'index'],
				'object',
				'type'
			],
			alphabetize: { order: 'asc', caseInsensitive: true },
			'newlines-between': 'never',
			warnOnUnassignedImports: false
		}
	],
	'import/newline-after-import': 'off',
	'import/first': 'error',
	'import/no-unresolved': 'off'
};

const importSortingSettings = {
	'import/parsers': {
		'@typescript-eslint/parser': ['.ts', '.tsx', '.cts', '.mts', '.d.ts']
	},
	'import/resolver': {
		node: {
			extensions: ['.js', '.ts', '.svelte']
		},
		typescript: {
			project: ['./tsconfig.json']
		}
	},
	'import/internal-regex': '^\\$(app|env|lib)/'
};

export default ts.config(
	js.configs.recommended,
	...ts.configs.recommended,
	...svelte.configs.recommended,
	prettier,
	...svelte.configs.prettier,
	{
		languageOptions: {
			globals: { ...globals.browser, ...globals.node }
		},
		plugins: {
			import: importPlugin
		},
		rules: {
			...importSortingRules
		},
		settings: {
			...importSortingSettings
		}
	},
	{
		files: ['**/*.svelte', '**/*.svelte.ts', '**/*.svelte.js'],
		languageOptions: {
			parserOptions: {
				projectService: true,
				extraFileExtensions: ['.svelte'],
				parser: ts.parser,
				svelteConfig
			}
		},
		plugins: {
			import: importPlugin
		},
		rules: {
			...importSortingRules,
			'svelte/no-navigation-without-resolve': 'warn',
			'svelte/prefer-svelte-reactivity': 'warn'
		},
		settings: {
			...importSortingSettings
		}
	},
	{
		rules: {
			'svelte/no-navigation-without-resolve': 'warn',
			'svelte/prefer-svelte-reactivity': 'warn'
		}
	}
);
