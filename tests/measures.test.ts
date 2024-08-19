import { expect, test } from './fixtures';

test('can add measure with status idea', async ({ page, measuresPage }) => {
	await measuresPage.addIdea();
	await page.getByLabel('Measure').fill('Lorem ipsum');
	await page.getByRole('button', { name: 'Save', exact: true }).click();
});
