import { expect, test } from './fixtures';
import { etag } from '$lib/models';

test.use({ suiteId: 'slug-url' });
test.use({ storageState: 'tests/.auth/admin.json' });

test('organization with slug is reachable via slug URL', async ({
	adminContext,
	testOrganization
}) => {
	const slug = `slug-e2e-${testOrganization.guid.slice(0, 8)}`;

	const currentResponse = await adminContext.request.get(`/container/${testOrganization.guid}`);
	expect(currentResponse.ok()).toBeTruthy();
	const current = await currentResponse.json();

	const updateResponse = await adminContext.request.post(
		`/container/${testOrganization.guid}/revision`,
		{
			headers: {
				'Content-Type': 'application/json',
				'If-Match': etag(current)
			},
			data: {
				...current,
				payload: {
					...current.payload,
					slug
				}
			}
		}
	);
	expect(updateResponse.status()).toBe(201);

	const response = await adminContext.request.get(`/${slug}/all/page`);
	expect(response.status()).toBe(200);
});

test('organizational unit with slug is reachable via slug URL', async ({
	adminContext,
	testOrganizationalUnit
}) => {
	const slug = `slug-e2e-ou-${testOrganizationalUnit.guid.slice(0, 8)}`;

	const currentResponse = await adminContext.request.get(
		`/container/${testOrganizationalUnit.guid}`
	);
	expect(currentResponse.ok()).toBeTruthy();
	const current = await currentResponse.json();

	const updateResponse = await adminContext.request.post(
		`/container/${testOrganizationalUnit.guid}/revision`,
		{
			headers: {
				'Content-Type': 'application/json',
				'If-Match': etag(current)
			},
			data: {
				...current,
				payload: {
					...current.payload,
					slug
				}
			}
		}
	);
	expect(updateResponse.status()).toBe(201);

	const response = await adminContext.request.get(`/${slug}/all/page`);
	expect(response.status()).toBe(200);
});
