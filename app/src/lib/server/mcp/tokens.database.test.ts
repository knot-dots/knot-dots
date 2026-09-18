import { randomBytes } from 'node:crypto';
import { expect } from 'vitest';
import { v4 as uuid } from 'uuid';
import { type Fixtures, test } from '$lib/fixtures';
import {
	createMcpToken,
	createOrUpdateUser,
	getMcpTokensForUser,
	revokeMcpToken
} from '$lib/server/db';

const realm = 'test';

async function createTestUser(connection: Fixtures['connection']) {
	const guid = uuid();
	await createOrUpdateUser({ family_name: '', given_name: '', guid, realm, settings: {} })(
		connection
	);
	return guid;
}

test('creates, lists, and revokes a token only for its owner', async ({ connection }: Fixtures) => {
	const owner = await createTestUser(connection);
	const otherUser = await createTestUser(connection);
	const secretHash = randomBytes(32);

	const created = await createMcpToken({
		name: 'MCP test client',
		prefix: 'mcp_pat_test1234',
		scopes: ['organizations:read'],
		secretHash,
		userId: owner
	})(connection);

	expect(created).toMatchObject({
		name: 'MCP test client',
		prefix: 'mcp_pat_test1234',
		revoked_at: null,
		scopes: ['organizations:read']
	});
	expect(created.created_at).toBeInstanceOf(Date);
	expect(created.expires_at).toBeInstanceOf(Date);
	expect(await getMcpTokensForUser(otherUser)(connection)).toEqual([]);
	expect(await revokeMcpToken(created.id, otherUser)(connection)).toBe(false);
	expect(await revokeMcpToken(created.id, owner)(connection)).toBe(true);

	const [revoked] = await getMcpTokensForUser(owner)(connection);
	expect(revoked.revoked_at).toBeInstanceOf(Date);
});
