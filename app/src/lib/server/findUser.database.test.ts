import { expect } from 'vitest';
import { v4 as uuid } from 'uuid';
import { type Fixtures, test } from '$lib/fixtures';
import { createOrUpdateUser, findUser } from '$lib/server/db';

test('finds a user with their settings', async ({ connection }: Fixtures) => {
	const guid = uuid();
	await createOrUpdateUser({
		family_name: 'Adagio',
		given_name: 'Ada',
		guid,
		realm: 'test',
		settings: { features: ['MCP'] }
	})(connection);

	await expect(findUser(guid)(connection)).resolves.toMatchObject({
		guid,
		settings: { features: ['MCP'] }
	});
});

test('finds nothing for a subject who has never signed in', async ({ connection }: Fixtures) => {
	await expect(findUser(uuid())(connection)).resolves.toBeNull();
});
