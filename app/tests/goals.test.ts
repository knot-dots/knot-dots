import { expect, test } from './fixtures';

// This test verifies that adding a Progress section to a goal
// makes a progress bar appear on the goal card, and that deleting
// the section removes the progress bar from the card again.

test.describe('Goal progress section', () => {
	// Use admin to ensure we have permission to create and edit
	test.use({ storageState: 'tests/.auth/admin.json' });

	test('adding and removing a progress section updates the goal card', async ({
		dotsBoard,
		testGoal
	}) => {
		await dotsBoard.goto(`/${testGoal.organization}`);
		await dotsBoard.card(testGoal.payload.title).click();
		await dotsBoard.overlay.editModeToggle.check();

		// Add a Progress section and set the progress slider to 80%
		const section = await dotsBoard.overlay.addSection('Progress');
		const progressSlider = section.getByRole('slider');
		await expect(progressSlider).toBeVisible();
		const sliderOffsetWidth = await progressSlider.evaluate((el) => {
			return el.getBoundingClientRect().width * 0.8;
		});
		await progressSlider.hover({ position: { x: sliderOffsetWidth, y: 10 } });
		await dotsBoard.page.mouse.down();
		const saveResponse = dotsBoard.page.waitForResponse(/x-sveltekit-invalidated/);
		await dotsBoard.page.mouse.up();
		await saveResponse;

		// Verify the card shows a progress bar in the footer
		await dotsBoard.overlay.closeButton.click();
		await expect(dotsBoard.card(testGoal.payload.title).getByRole('progressbar')).toBeVisible();

		// Remove the Summary section
		await dotsBoard.card(testGoal.payload.title).click();
		await section.hover();
		await section.getByRole('button', { name: 'Settings' }).click();
		await section.getByRole('button', { name: 'Delete' }).click();
		const deleteResponse = dotsBoard.page.waitForResponse(/x-sveltekit-invalidated/);
		await dotsBoard.page.getByRole('button', { name: /I want to delete/i }).click();
		await deleteResponse;

		// Verify the goal card no longer shows a progress bar in the footer
		await dotsBoard.overlay.closeButton.click();
		await expect(dotsBoard.card(testGoal.payload.title).getByRole('progressbar')).not.toBeVisible();
	});
});
