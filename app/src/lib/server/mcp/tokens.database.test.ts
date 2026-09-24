import { randomBytes } from 'node:crypto';
import { expect } from 'vitest';
import { v4 as uuid } from 'uuid';
import { type Fixtures, test } from '$lib/fixtures';
import {
	authenticateMcpToken,
	createMcpToken,
	createOrUpdateUser,
	getMcpTokensForUser,
	revokeMcpToken,
	sql
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
	const authenticated = await authenticateMcpToken(secretHash)(connection);
	expect(authenticated).toEqual({
		expires_at: created.expires_at,
		id: created.id,
		scopes: ['organizations:read'],
		user_id: owner
	});
	expect(await getMcpTokensForUser(otherUser)(connection)).toEqual([]);
	expect(await revokeMcpToken(created.id, otherUser)(connection)).toBe(false);
	expect(await revokeMcpToken(created.id, owner)(connection)).toBe(true);

	const [revoked] = await getMcpTokensForUser(owner)(connection);
	expect(revoked.revoked_at).toBeInstanceOf(Date);
	expect(revoked.last_used_at).toBeInstanceOf(Date);
	expect(await authenticateMcpToken(secretHash)(connection)).toBeNull();
});

test('does not authenticate or update an expired token', async ({ connection }: Fixtures) => {
	const owner = await createTestUser(connection);
	const secretHash = randomBytes(32);
	await createMcpToken({
		name: 'Expired MCP client',
		prefix: 'mcp_pat_expired1',
		scopes: [],
		secretHash,
		userId: owner
	})(connection);
	await connection.query(sql.typeAlias('void')`
		UPDATE mcp_token
		SET expires_at = now() - interval '1 day',
			created_at = now() - interval '2 days'
		WHERE secret_hash = ${sql.binary(secretHash)}
	`);

	expect(await authenticateMcpToken(secretHash)(connection)).toBeNull();
	const [expired] = await getMcpTokensForUser(owner)(connection);
	expect(expired.last_used_at).toBeNull();
});
