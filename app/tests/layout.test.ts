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
