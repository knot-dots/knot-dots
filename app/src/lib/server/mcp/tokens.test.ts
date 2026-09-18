import { describe, expect, test } from 'vitest';
import { generateMcpToken, hashMcpToken } from './tokens';

describe('MCP tokens', () => {
	test('generates a namespaced URL-safe token and a database-ready hash', () => {
		const generated = generateMcpToken();

		expect(generated.token).toMatch(/^mcp_pat_[A-Za-z0-9_-]{43}$/);
		expect(generated.prefix).toBe(generated.token.slice(0, 16));
		expect(generated.secretHash).toEqual(hashMcpToken(generated.token));
		expect(generated.secretHash).toHaveLength(32);
	});

	test('generates unique secrets', () => {
		expect(generateMcpToken().token).not.toBe(generateMcpToken().token);
	});
});
