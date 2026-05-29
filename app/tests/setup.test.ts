import { expect, test } from './fixtures';

test.use({ suiteId: 'setup' });

// This test project tests the initial user and object setup

test.describe(() => {
	test.use({ storageState: 'tests/.auth/bob.json' });

	test('Bob can see test goal', async ({ isMobile, page, testGoal }) => {
		await page.goto('/');

		// Expect to be logged in as Bob
		if (!isMobile) {
			await expect(
				page.getByRole('navigation').getByRole('button', { name: 'User menu' })
			).toBeVisible();
		}

		await page.getByRole('button', { name: 'Choose workspace', exact: true }).click();
		await page.getByRole('menuitem', { name: /^Goals\b/ }).click();

		await expect(page.getByRole('article', { name: testGoal.payload.title }).first()).toBeVisible();
	});
});
