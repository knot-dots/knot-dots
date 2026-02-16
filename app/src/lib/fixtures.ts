import { test as base } from 'vitest';
import type { DatabaseTransactionConnection } from 'slonik';
import { getPool } from '$lib/server/db';

export interface Fixtures {
	connection: DatabaseTransactionConnection;
}

export const test = base.extend<Fixtures>({
	// eslint-disable-next-line no-empty-pattern
	connection: async ({}, use) => {
		const pool = await getPool();
		try {
			await pool.transaction(async (connection) => {
				await use(connection);
				throw new Error('trigger rollback');
			});
		} catch (e) {
			if (!(e instanceof Error) || e.message !== 'trigger rollback') {
				throw e;
			}
		}
	}
});
