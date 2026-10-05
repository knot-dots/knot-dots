import { expect, test } from './fixtures';

test.use({ suiteId: 'program-table', storageState: 'tests/.auth/orgadmin.json' });

test('the table is an alternative view of the levels board', async ({
	aiGoal,
	isMobile,
	page,
	testProgram
}) => {
	test.skip(isMobile, 'Workspace menu is not visible on mobile');

	// Fullscreen: the table route lists the program objects
	await page.goto(`/${testProgram.organization}/${testProgram.guid}/all/table`);
	const table = page.getByRole('main').getByRole('table');
	await expect(table.getByRole('row').filter({ hasText: aiGoal.payload.title })).toHaveCount(1);

	// The workspace menu switches between the board and the table
	await page.getByRole('button', { name: 'Table', exact: true }).click();
	await page.getByRole('menuitem', { name: 'Level board', exact: true }).click();
	await expect(page).toHaveURL(new RegExp(`/${testProgram.guid}/all/level$`));
	await expect(page.getByRole('main').getByRole('table')).toHaveCount(0);
	await page.getByRole('button', { name: 'Level board', exact: true }).click();
	await page.getByRole('menuitem', { name: 'Table', exact: true }).click();
	await expect(page).toHaveURL(new RegExp(`/${testProgram.guid}/all/table$`));
	await expect(
		page
			.getByRole('main')
			.getByRole('table')
			.getByRole('row')
			.filter({ hasText: aiGoal.payload.title })
	).toHaveCount(1);

	// Overlay: the table is a variant of the chapters overlay and switches back to the board
	await page.goto(`/${testProgram.organization}#chapters=${testProgram.guid}&table=`);
	const overlay = page.locator('.overlay');
	await expect(
		overlay.getByRole('table').getByRole('row').filter({ hasText: aiGoal.payload.title })
	).toHaveCount(1);
	await overlay.getByRole('button', { name: 'Table', exact: true }).click();
	await overlay.getByRole('menuitem', { name: 'Level board', exact: true }).click();
	await expect(page).toHaveURL(new RegExp(`#chapters=${testProgram.guid}$`));
	await expect(overlay.getByRole('table')).toHaveCount(0);
});
