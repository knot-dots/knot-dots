import { expect, test } from 'vitest';
import { locale } from 'svelte-i18n';
import { newContainer, payloadTypes, predicates } from '$lib/models';
import { POST } from './+server';

locale.set('en');

const organizationGuid = '00000000-0000-4000-8000-000000000001';
const sourceGuid = '00000000-0000-4000-8000-000000000002';
const userGuid = '00000000-0000-4000-8000-000000000003';
const user = {
	adminOf: [],
	collaboratorOf: [],
	familyName: 'Admin',
	givenName: 'Test',
	guid: userGuid,
	headOf: [],
	isAuthenticated: true,
	memberOf: [],
	roles: ['sysadmin'],
	settings: {}
};

test.each(['is-copy-of', 'is-individual-profile-of'] as const)(
	'ordinary creation rejects client-supplied %s provenance',
	async (predicate) => {
		const body = newContainer.parse({
			managed_by: organizationGuid,
			organization: organizationGuid,
			organizational_unit: null,
			payload: { title: 'Spoofed copy', type: payloadTypes.enum.text },
			realm: 'client-controlled',
			relation: [{ object: sourceGuid, position: 0, predicate }]
		});
		const request = new Request('http://localhost/container', {
			method: 'POST',
			body: JSON.stringify(body),
			headers: { 'Content-Type': 'application/json' }
		});

		await expect(POST({ locals: { pool: {}, user }, request } as never)).rejects.toMatchObject({
			status: 422
		});
	}
);

test('ordinary creation rejects is-available-in relations on non-templates', async () => {
	const body = newContainer.parse({
		managed_by: organizationGuid,
		organization: organizationGuid,
		organizational_unit: null,
		payload: { template: false, title: 'Not a template', type: payloadTypes.enum.goal },
		realm: 'realm',
		relation: [
			{
				object: sourceGuid,
				position: 0,
				predicate: predicates.enum['is-available-in']
			}
		]
	});
	const request = new Request('http://localhost/container', {
		method: 'POST',
		body: JSON.stringify(body),
		headers: { 'Content-Type': 'application/json' }
	});

	await expect(POST({ locals: { pool: {}, user }, request } as never)).rejects.toMatchObject({
		status: 422
	});
});
