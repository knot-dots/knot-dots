import { expect, test, vi } from 'vitest';
import { locale } from 'svelte-i18n';
import { POST } from './+server';

locale.set('en');

const containerGuid = '00000000-0000-4000-8000-000000000001';
const sourceGuid = '00000000-0000-4000-8000-000000000002';
const user = {
	adminOf: [],
	collaboratorOf: [],
	familyName: 'Admin',
	givenName: 'Test',
	guid: '00000000-0000-4000-8000-000000000003',
	headOf: [],
	isAuthenticated: true,
	memberOf: [],
	roles: ['sysadmin'],
	settings: {}
};

test.each(['is-copy-of', 'is-individual-profile-of'] as const)(
	'relation updates reject client-supplied %s provenance before writing',
	async (predicate) => {
		const transaction = vi.fn();
		const request = new Request(`http://localhost/container/${containerGuid}/relation`, {
			method: 'POST',
			body: JSON.stringify([
				{ object: sourceGuid, position: 0, predicate, subject: containerGuid }
			]),
			headers: { 'Content-Type': 'application/json' }
		});

		await expect(
			POST({
				locals: { pool: { transaction }, user },
				params: { guid: containerGuid },
				request
			} as never)
		).rejects.toMatchObject({ status: 422 });
		expect(transaction).not.toHaveBeenCalled();
	}
);

test('relation updates reject direct availability changes before writing', async () => {
	const transaction = vi.fn();
	const request = new Request(`http://localhost/container/${containerGuid}/relation`, {
		method: 'POST',
		body: JSON.stringify([
			{
				object: sourceGuid,
				position: 0,
				predicate: 'is-available-in',
				subject: containerGuid
			}
		]),
		headers: { 'Content-Type': 'application/json' }
	});

	await expect(
		POST({
			locals: { pool: { transaction }, user },
			params: { guid: containerGuid },
			request
		} as never)
	).rejects.toMatchObject({ status: 422 });
	expect(transaction).not.toHaveBeenCalled();
});
