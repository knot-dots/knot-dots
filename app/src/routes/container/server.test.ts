import { expect, test } from 'vitest';
import { locale } from 'svelte-i18n';
import { newContainer, payloadTypes } from '$lib/models';
import { POST } from './+server';

locale.set('en');

const organizationGuid = '00000000-0000-4000-8000-000000000001';
const sourceGuid = '00000000-0000-4000-8000-000000000002';
const userGuid = '00000000-0000-4000-8000-000000000003';
const user = {
	creatableOf: [],
	deletableOf: [],
	familyName: 'Admin',
	givenName: 'Test',
	guid: userGuid,
	manageMembersOf: [],
	isAuthenticated: true,
	readableOf: [],
	updatableOf: [],
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
