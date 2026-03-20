import { expect, test } from './fixtures';

test.use({ suiteId: 'organizational-unit-profile-switch' });
test.use({ storageState: 'tests/.auth/bob.json' });

test('allows switching between standard and individual profile from the profile switch', async ({
	page,
	testIndividualProfile,
	testOrganizationalUnit
}) => {
	await page.goto(`/${testOrganizationalUnit.guid}/all/page`);
	await expect(page).toHaveURL(new RegExp(`/${testOrganizationalUnit.guid}/all/page$`));
	await expect(
		page.getByRole('heading', { name: testOrganizationalUnit.payload.name, exact: false })
	).toBeVisible();

	const switchRoot = page.locator('.profile-switch');
	await expect.poll(async () => await switchRoot.count()).toBeGreaterThan(0);
	await expect(switchRoot).toBeVisible();
	await expect(switchRoot).toHaveCSS('background-color', 'rgb(255, 255, 255)');

	const standardActive = switchRoot.locator('.profile-switch-item--active', {
		hasText: 'Standard profile'
	});
	const individualLink = switchRoot.getByRole('link', { name: 'Individual profile' });

	await expect(standardActive).toBeVisible();
	await expect(individualLink).toBeVisible();
	await expect(individualLink).toHaveCSS('background-color', 'rgb(255, 255, 255)');

	await Promise.all([
		page.waitForURL(new RegExp(`/${testIndividualProfile.guid}/all/page$`)),
		individualLink.click()
	]);

	const switchedRoot = page.locator('.profile-switch');
	await expect(
		switchedRoot.locator('.profile-switch-item--active', { hasText: 'Individual profile' })
	).toBeVisible();
	await expect(switchedRoot.getByRole('link', { name: 'Standard profile' })).toBeVisible();
});
