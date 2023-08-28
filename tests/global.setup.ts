import { faker } from '@faker-js/faker/locale/de';
import { expect, request, test as setup } from '@playwright/test';

setup('register user and create default organization', async () => {
	const oidcContext = await request.newContext({
		baseURL: 'http://localhost:8080'
	});
	const tokenResponse = await oidcContext.post('/realms/agaric/protocol/openid-connect/token', {
		form: { grant_type: 'client_credentials' },
		headers: {
			Authorization: `Basic ${btoa(
				`${process.env.KC_SERVICE_ACCOUNT_CLIENT_ID}:${process.env.KC_SERVICE_ACCOUNT_CLIENT_SECRET}`
			)}`
		}
	});
	const tokenResponsePayload = await tokenResponse.json();

	const appContext = await request.newContext({
		baseURL: 'http://localhost:3000'
	});
	const organizationResponse = await appContext.post('/container', {
		data: {
			organization: '00000000-0000-0000-0000-000000000000',
			organizational_unit: null,
			payload: {
				name: faker.location.city(),
				slug: faker.internet.domainWord(),
				default: true,
				description: faker.lorem.text(),
				type: 'organization'
			},
			realm: 'agaric',
			relation: [],
			user: []
		},
		headers: {
			Authorization: `Bearer ${tokenResponsePayload.access_token}`
		}
	});
	expect(organizationResponse.ok()).toBeTruthy();
});
