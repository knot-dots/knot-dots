import { expect, test } from '@playwright/test';
test('home screen has expected regions', async ({ page, viewport }) => {
	await page.goto('/');
	await expect(page.getByRole('navigation')).toBeVisible();
	await expect(page.getByRole('main')).toBeVisible();

	if (viewport && viewport.width >= 768) {
		await expect(page.getByRole('complementary')).toBeVisible();
	} else {
		await expect(page.getByRole('complementary')).toBeHidden();
	}
});

test('navigation contains expected elements', async ({ page, viewport }) => {
	await page.goto('/');
	await expect(
		page.getByRole('navigation').getByRole('link', { name: 'Home screen' })
	).toBeVisible();
	await expect(
		page.getByRole('navigation').getByRole('link', { name: 'Strategies' })
	).toBeVisible();
	await expect(
		page.getByRole('navigation').getByRole('link', { name: 'Objectives' })
	).toBeVisible();
	await expect(page.getByRole('navigation').getByRole('link', { name: 'Measures' })).toBeVisible();

	if (viewport && viewport.width >= 1440) {
		await expect(page.getByRole('navigation').getByRole('link', { name: 'Log in' })).toBeVisible();
		await expect(
			page.getByRole('navigation').getByRole('link', { name: 'Register' })
		).toBeVisible();
	}

	if (viewport && viewport.width >= 768) {
		await expect(
			page.getByRole('navigation').getByRole('button', { name: 'Open sidebar' })
		).toBeHidden();
	} else {
		await expect(
			page.getByRole('navigation').getByRole('button', { name: 'Open sidebar' })
		).toBeVisible();
	}
});

test('sidebar can be opened and closed', async ({ page, viewport }) => {
	test.skip(!viewport || viewport?.width >= 768);

	await page.goto('/');
	await page.getByRole('button', { name: 'Open sidebar' }).click();
	await expect(page.getByRole('complementary')).toBeVisible();
	await page.getByRole('button', { name: 'Close sidebar' }).click();
	await expect(page.getByRole('complementary')).toBeHidden();
});

test('sidebar can be collapsed and expanded', async ({ page, viewport }) => {
	test.skip(!viewport || viewport?.width < 768);

	await page.goto('/');
	await page.getByRole('button', { name: 'Collapse sidebar' }).click();
	await page.getByRole('button', { name: 'Expand sidebar' }).click();
});
