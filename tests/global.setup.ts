import { test as setup, expect } from './fixtures';

const authFile = 'tests/.auth/user.json';

setup('create user and log in', async ({ page, playwright }) => {
	const credentials = Buffer.from(
		`${process.env.PUBLIC_KC_CLIENT_ID}:${process.env.KC_CLIENT_SECRET}`
	).toString('base64');
	const apiContext = await playwright.request.newContext({
		baseURL: 'http://localhost:8080',
		proxy: undefined
	});

	const tokenResponse = await apiContext.post('/realms/agaric/protocol/openid-connect/token', {
		form: { grant_type: 'client_credentials' },
		headers: { Authorization: `Basic ${credentials}` }
	});
	expect(tokenResponse.ok()).toBeTruthy();

	const data = await tokenResponse.json();
	const userResponse = await apiContext.post('/admin/realms/agaric/users', {
		data: {
			credentials: [{ type: 'password', value: 'p455w0rd' }],
			email: 'playwright@knotdots.test',
			emailVerified: true,
			enabled: true,
			firstName: 'William',
			lastName: 'Shakespeare'
		},
		headers: { Authorization: `Bearer ${data.access_token}` }
	});
	expect(userResponse.status()).toBeLessThan(500);

	if (userResponse.ok()) {
		const userID = userResponse.headers().location.split('/').pop();
		const roleMappingResponse = await apiContext.post(
			`/admin/realms/agaric/users/${userID}/role-mappings/realm`,
			{
				data: [{ id: '5eca0d44-7d46-4095-9915-ca37db86e3fa', name: 'sysadmin' }],
				headers: { Authorization: `Bearer ${data.access_token}` }
			}
		);
		expect(roleMappingResponse.status()).toBeLessThan(500);
	}

	await page.goto('/');
	await page.getByRole('button', { name: 'Log in' }).click();
	await page.getByLabel('Email').fill('playwright@knotdots.test');
	await page.getByLabel('Password').fill('p455w0rd');
	await page.getByRole('button', { name: 'Sign In' }).click();
	await expect(page.getByRole('link', { name: 'WS', exact: true })).toBeVisible();

	await page.context().storageState({ path: authFile });
});

setup.describe(() => {
	setup.use({ storageState: authFile });

	setup('create an organization', async ({ page, overlay }) => {
		await page.goto('/');
		await page.getByRole('button', { name: 'Open organization menu' }).click();
		await page.getByRole('navigation').getByText('Add item').click();
		await overlay.organizationForm.nameInput.fill('Musterhausen');
		await overlay.organizationForm.categorySelect.selectOption('Government');
		await overlay.organizationForm.boardsListbox.getByLabel('Indicators').click();
		await overlay.organizationForm.boardsListbox.getByLabel('Organizational units').click();
		await overlay.organizationForm.save();

		await page.goto('/');
		await page.getByRole('button', { name: 'Open organization menu' }).click();
		await expect(page.getByRole('link', { name: 'Musterhausen' })).toBeVisible();
	});
});
