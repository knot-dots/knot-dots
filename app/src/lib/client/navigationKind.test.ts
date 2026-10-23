import { describe, expect, test } from 'vitest';
import navigationKind from './navigationKind';

function navigation(from: string | null, to: string | null) {
	return {
		from: from ? ({ url: new URL(from) } as never) : null,
		to: to ? ({ url: new URL(to) } as never) : null
	};
}

describe('navigationKind', () => {
	test('is undefined while not navigating', () => {
		expect(navigationKind(null)).toBeUndefined();
		expect(navigationKind(navigation('https://example.com/a', null))).toBeUndefined();
	});

	test('detects changes of the path as page navigation', () => {
		expect(navigationKind(navigation('https://example.com/a', 'https://example.com/b'))).toBe(
			'page'
		);
		expect(navigationKind(navigation(null, 'https://example.com/b'))).toBe('page');
	});

	test('detects changes of the query only', () => {
		expect(
			navigationKind(navigation('https://example.com/a?x=1#view=1', 'https://example.com/a?x=2'))
		).toBe('query');
	});

	test('detects changes of the hash only', () => {
		expect(
			navigationKind(navigation('https://example.com/a?x=1', 'https://example.com/a?x=1#view=1'))
		).toBe('hash');
	});
});
