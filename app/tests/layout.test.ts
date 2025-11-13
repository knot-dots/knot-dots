import { expect, test } from '@playwright/test';

test('home screen has expected regions', async ({ page, viewport }) => {
	await page.goto('/');
	await expect(page.getByRole('banner')).toBeVisible();
	await expect(page.getByRole('main')).toBeVisible();
	await expect(page.getByRole('navigation')).toBeVisible();
});

test('navigation contains expected elements', async ({ page, viewport }) => {
	await page.goto('/');
	await expect(page.getByRole('banner').getByRole('button', { name: 'Log in' })).toBeVisible();

	if (viewport && viewport.width >= 480) {
		await expect(
			page.getByRole('navigation').locator('header').getByRole('link', { name: 'knotdots.net' })
		).toBeVisible();
		await expect(
			page
				.getByRole('banner')
				.getByRole('button', { name: 'Organizations and organizational units' })
		).toBeVisible();
		await expect(page.getByRole('banner').getByRole('link', { name: 'dots' })).toBeVisible();
	}
});

test.describe(() => {
	test.use({ storageState: 'tests/.auth/bob.json' });

	test('badge is not editable by Bob', async ({ page }) => {
		await page.goto('/');
		await page.getByRole('button', { name: 'All', exact: true }).click();
		await page.getByRole('menuitem', { name: 'Goals' }).click();
		await page.getByRole('article', { name: 'Test goal' }).first().click();

		// Edit switch
		const overlay = page.locator('.overlay');
		await overlay.getByRole('checkbox', { name: 'Edit mode', exact: true }).check();

		const badgeList = page.locator('ul.badges');
		const badgeButtons = badgeList.getByRole('button');

		if ((await badgeButtons.count()) > 0) {
			await expect(badgeButtons).not.toBeEditable();
		}
	});

	test('progress is not editable by Bob', async ({ page }) => {
		await page.goto('/');
		await page.getByRole('button', { name: 'All', exact: true }).click();
		await page.getByRole('menuitem', { name: 'Goals' }).click();
		await page.getByRole('article', { name: 'Test goal' }).first().click();

		// Edit switch
		const overlay = page.locator('.overlay');
		await overlay.getByRole('checkbox', { name: 'Edit mode', exact: true }).check();

		const slider = page.getByRole('slider', { name: 'Progress' });

		if ((await slider.count()) > 0) {
			await expect(slider).not.toBeEditable();
		}
	});
});
