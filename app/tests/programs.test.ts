import { expect, test } from './fixtures';

test.describe('Level board', () => {
	test.use({ storageState: 'tests/.auth/admin.json' });

	test('create goals', async ({ dotsBoard, isMobile, testOrganization, testProgram }) => {
		test.skip(isMobile, 'Workspace menu is not visible on mobile');

		await dotsBoard.goto(`/${testOrganization.guid}`);

		await dotsBoard.card(testProgram.payload.title).click();
		await dotsBoard.overlay.editModeToggle.check();

		// Assert the program is managed by the expected team
		await dotsBoard.overlay.disclosePropertiesButton.click();
		await expect(dotsBoard.overlay.locator.locator(':has-text("Managed by") + .value')).toHaveText(
			'Bob Builder'
		);

		// Switch to the levels board
		await dotsBoard.overlay.locator.getByRole('button', { name: 'Page' }).click();
		await dotsBoard.overlay.locator.getByRole('menuitem', { name: 'Level board' }).click();
		await expect(dotsBoard.overlay.locator.getByRole('heading', { name: 'Goals' })).toBeVisible();
		await expect(
			dotsBoard.overlay.locator.getByRole('heading', { name: 'Implementation' })
		).toBeVisible();

		for (const item of ['Goal']) {
			const title = `${item} for ${testProgram.payload.title}`;

			// Create a new item
			const column = dotsBoard.overlay.locator.locator('section', { hasText: item });
			await column.getByRole('button', { name: 'Add item' }).first().click();
			await dotsBoard.page.getByRole('textbox', { name: 'Title' }).fill(title);
			await dotsBoard.page.getByRole('button', { name: 'Save' }).click();

			// Verify the created item is part of the program and managed by the same team
			await expect(dotsBoard.overlay.title).toHaveText(title);
			await dotsBoard.overlay.disclosePropertiesButton.click();
			await expect(dotsBoard.overlay.locator.getByLabel('Program', { exact: true })).toHaveText(
				testProgram.payload.title
			);
			await expect(
				dotsBoard.overlay.locator.locator(':has-text("Managed by") + .value')
			).toHaveText('Bob Builder');

			// Delete the item
			await dotsBoard.overlay.delete();
		}
	});
});
