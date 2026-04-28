import { expect, test } from './fixtures';

test.use({ suiteId: 'elasticsearch' });
test.use({ storageState: 'tests/.auth/admin.json' });

test.describe('Optimistic frontend updates with Elasticsearch', () => {
	test('created goal appears immediately on the board', async ({ dotsBoard, testOrganization }) => {
		await dotsBoard.goto(`/${testOrganization.guid}`);
		await dotsBoard.header.editModeToggle.check();

		const goalTitle = `ES Optimistic Goal ${Date.now()}`;

		await dotsBoard.column('Goals').addItemButton.click();
		const dialog = dotsBoard.page.getByRole('dialog');
		await expect(dialog).toBeVisible();
		await dialog.getByPlaceholder('Title').fill(goalTitle);
		await dialog.getByRole('button', { name: 'Save' }).click();

		// The overlay opens for the newly created goal
		await expect(dotsBoard.overlay.title).toHaveText(goalTitle);
		await dotsBoard.overlay.closeButton.click();

		// The goal card should be visible immediately (optimistic update),
		// even before Elasticsearch has indexed it.
		await expect(dotsBoard.card(goalTitle)).toBeVisible();
	});

	test('updated title is reflected immediately on the board', async ({
		dotsBoard,
		testMeasure
	}) => {
		const updatedTitle = `Updated Measure ${Date.now()}`;

		// Navigate directly to the overlay via URL hash
		await dotsBoard.page.goto(
			`/${testMeasure.organization}/measures/status#view=${testMeasure.guid}`
		);
		await dotsBoard.overlay.editModeToggle.check();

		// Change the title and wait for autosave to persist
		const titleField = dotsBoard.overlay.locator.getByRole('heading', { level: 1 });
		await titleField.fill(updatedTitle);

		// Close the overlay and verify the updated title on the board
		await dotsBoard.overlay.closeButton.click();
		await expect(dotsBoard.card(updatedTitle)).toBeVisible();
	});
});
