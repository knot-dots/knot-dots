import { expect, test } from './fixtures';

test('can create strategy', async ({ dotsPage, overlay }) => {
	const initialProgramCount = await dotsPage.programs.count();
	await dotsPage.addProgram();
	await overlay.strategyForm.titleInput.fill('Lorem ipsum');
	await overlay.strategyForm.strategyTypeSelect.selectOption('Sustainability');
	await overlay.strategyForm.topicListbox.getByLabel('Cityscape').check();
	await overlay.strategyForm.topicListbox.getByLabel('Environment').check();
	await overlay.strategyForm.categoryListbox.getByLabel('Climate action').check();
	await overlay.strategyForm.categoryListbox
		.getByLabel('Sustainable cities and communities')
		.check();
	await overlay.strategyForm.saveButton.click();
	await expect(overlay.strategyView.title).toHaveText('Lorem ipsum');
	await expect(dotsPage.programs).toHaveCount(initialProgramCount + 1);

	await overlay.strategyView.addChapter();
	await expect(overlay.undefinedForm.titleInput).toBeHidden();
	await overlay.undefinedForm.payloadTypeSelect.selectOption('Model');
	await expect(overlay.modelForm.titleInput).toBeVisible();
});
