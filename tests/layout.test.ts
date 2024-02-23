import { expect, test } from '@playwright/test';
test('home screen has expected regions', async ({ page, viewport }) => {
	await page.goto('/');
	await expect(page.getByRole('navigation')).toBeVisible();
	await expect(page.getByRole('main')).toBeVisible();
	await expect(page.getByRole('complementary')).toBeVisible();
});

test('navigation contains expected elements', async ({ page, viewport }) => {
	await page.goto('/');
	await expect(
		page.getByRole('navigation').getByRole('button', { name: 'Organization menu' })
	).toBeVisible();
	await expect(page.getByRole('navigation').getByRole('link', { name: 'Programs' })).toBeVisible();
	await expect(page.getByRole('navigation').getByRole('link', { name: 'Elements' })).toBeVisible();
	await expect(
		page.getByRole('navigation').getByRole('link', { name: 'Implementation' })
	).toBeVisible();

	if (viewport && viewport.width >= 1440) {
		await expect(page.getByRole('navigation').getByRole('link', { name: 'Log in' })).toBeVisible();
	}
});
