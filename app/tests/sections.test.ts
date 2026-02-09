import { expect, test } from './fixtures';

test.use({ storageState: 'tests/.auth/admin.json' });

test('summary can be added and removed', async ({ dotsBoard, testMeasure }) => {
	await dotsBoard.goto(`/${testMeasure.organization}`);
	await dotsBoard.card(testMeasure.payload.title).click();
	await dotsBoard.overlay.editModeToggle.check();

	const summary = 'Lorem ipsum dolor sit amet consectetur adipiscing elit';

	// Add a Summary section
	const section = await dotsBoard.overlay.addSection('Summary');
	const saveResponse = dotsBoard.page.waitForResponse(/x-sveltekit-invalidated/);
	await section.getByRole('textbox', { name: 'Summary' }).fill(summary);
	await saveResponse;

	// Verify the card shows the summary
	await dotsBoard.overlay.closeButton.click();
	await expect(dotsBoard.card(testMeasure.payload.title)).toContainText(summary);

	// Remove the Summary section
	await dotsBoard.card(testMeasure.payload.title).click();
	await section.hover();
	await section.getByRole('button', { name: 'Settings' }).click();
	await section.getByRole('button', { name: 'Delete' }).click();
	const deleteResponse = dotsBoard.page.waitForResponse(/x-sveltekit-invalidated/);
	await dotsBoard.page.getByRole('button', { name: /I want to delete/i }).click();
	await deleteResponse;

	// Verify the card no longer shows the summary
	await dotsBoard.overlay.closeButton.click();
	await expect(dotsBoard.card(testMeasure.payload.title)).not.toContainText(summary);
});
