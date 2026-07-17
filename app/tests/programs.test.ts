import { expect, test } from './fixtures';

test.use({ suiteId: 'programs' });

test.describe('Level board', () => {
	test.use({ storageState: 'tests/.auth/bob.json' });

	test('create goals', async ({ dotsBoard, isMobile, testOrganization, testProgram }) => {
		test.skip(isMobile, 'Workspace menu is not visible on mobile');

		const teamPermissions = `${testOrganization.payload.name} / Team ${testProgram.payload.title}`;

		await dotsBoard.goto(`/${testProgram.organization}`);

		await dotsBoard.card(testProgram.payload.title).click();
		await dotsBoard.overlay.editModeToggle.check();

		// Assert the program grants permissions to the expected team
		await dotsBoard.overlay.disclosePropertiesButton.click();
		await expect(
			dotsBoard.overlay.locator.locator(':has-text("Team permissions") + .value')
		).toHaveText(teamPermissions);

		// Switch to the levels board
		await dotsBoard.overlay.locator.getByRole('button', { name: 'Page' }).click();
		await dotsBoard.overlay.locator.getByRole('menuitem', { name: 'Level board' }).click();
		// Switching the workspace reloads the overlay board client-side; allow for the fetch.
		await expect(dotsBoard.overlay.locator.getByRole('heading', { name: 'Goals' })).toBeVisible({
			timeout: 15000
		});

		for (const item of ['Goal']) {
			const title = `${item} for ${testProgram.payload.title}`;

			// Create a new item
			const column = dotsBoard.overlay.locator.locator('section', { hasText: item });
			await column.getByRole('button', { name: 'Add item' }).first().click();
			await dotsBoard.page.getByRole('textbox', { name: 'Title' }).fill(title);
			await dotsBoard.page.getByRole('button', { name: 'Save' }).click();

			// Verify the created item is part of the program and managed by the same team
			await expect(dotsBoard.overlay.title).toHaveText(title, { timeout: 15000 });
			await dotsBoard.overlay.disclosePropertiesButton.click();
			await expect(dotsBoard.overlay.locator.getByLabel('Program', { exact: true })).toHaveText(
				testProgram.payload.title
			);
			await expect(
				dotsBoard.overlay.locator.locator(':has-text("Team permissions") + .value')
			).toHaveText(teamPermissions);

			// Delete the item
			await dotsBoard.overlay.delete();
		}
	});
});
