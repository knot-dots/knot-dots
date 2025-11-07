import { expect, test } from '@playwright/test';

// This test project tests the initial user and object setup

test.describe(() => {
	test.use({ storageState: 'tests/.auth/bob.json' });

	test('Bob can see test goal', async ({ page }) => {
		await page.goto('/');

		// Expect to be logged in as Bob
		await expect(page.getByText('Bob Builder')).toBeVisible();

		await page.getByRole('button', { name: 'All', exact: true }).click();
		await page.getByRole('menuitem', { name: 'Goals' }).click();

		await expect(page.getByRole('article', { name: 'Test goal' }).first()).toBeVisible();
	});
});
