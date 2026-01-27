import { expect, test } from './fixtures';

// This test verifies that adding a Progress section to a goal
// makes a progress bar appear on the goal card, and that deleting
// the section removes the progress bar from the card again.

test.describe('Goal progress section', () => {
	// Use admin to ensure we have permission to create and edit
	test.use({ storageState: 'tests/.auth/admin.json' });

	test('adding and removing a progress section updates the goal card', async ({
		page,
		testGoal
	}) => {
		await page.goto(`/${testGoal.organization}/goals/level`);
		await page.getByTitle(testGoal.payload.title).click();

		const overlay = page.locator('.overlay');
		await expect(overlay).toBeVisible();

		// Activate edit mode
		await overlay.getByLabel('edit mode').check();

		// Add a Progress section
		await page.getByRole('button', { name: 'Add section' }).click();
		await page.getByRole('menuitem', { name: 'Progress' }).click();

		const progressSlider = overlay.getByRole('slider');
		await expect(progressSlider).toBeVisible();

		// Playwright slider interaction
		const sliderOffsetWidth = await progressSlider.evaluate((el) => {
			return el.getBoundingClientRect().width * 0.8;
		});
		await progressSlider.hover({ position: { x: sliderOffsetWidth, y: 10 } });
		await page.mouse.down();
		await page.mouse.up();

		// Close the overlay to go back to the goals list/cards
		await overlay.getByRole('link', { name: 'Close' }).click();
		await expect(overlay).toBeHidden();

		// Find the just-created goal card and verify it shows a progress element in the footer
		const goalCard = page.getByRole('article', { name: testGoal.payload.title }).first();
		await expect(goalCard).toBeVisible();
		await expect(goalCard.getByRole('progressbar')).toBeVisible();

		// Reopen the goal overlay by clicking the card
		await goalCard.click();
		await expect(overlay).toBeVisible();

		// Activate edit mode again
		await overlay.getByLabel('edit mode').check();

		// Locate the Progress section area and open its settings dropdown
		const progressSection = overlay
			.getByRole('listitem')
			.filter({ has: page.getByRole('heading', { name: 'Progress' }) });
		await progressSection.hover();
		await progressSection.getByRole('button', { name: 'Settings' }).click({ force: true });

		// Click the Delete action which opens a confirmation dialog
		await progressSection.getByRole('button', { name: 'Delete' }).click({ force: true });

		// Confirm delete in dialog
		await page.getByRole('button', { name: /I want to delete/i }).click({ force: true });

		// Close overlay
		await overlay.getByRole('link', { name: 'Close' }).click();
		await expect(overlay).toBeHidden();

		// Verify the goal card no longer shows a progress element in the footer
		const goalCardAfter = page.getByRole('article', { name: testGoal.payload.title }).first();
		await expect(goalCardAfter.getByRole('progressbar')).toHaveCount(0);
	});
});
