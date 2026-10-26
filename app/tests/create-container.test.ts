import { expect, test } from './fixtures';

test.use({ storageState: 'tests/.auth/orgadmin.json', suiteId: 'pages-create' });

test(`saves a page without body`, async ({ allCatalog, testOrganization }) => {
	await allCatalog.goto(`/${testOrganization.guid}`);
	const addItemMenu = await allCatalog.openAddItemMenu();
	await addItemMenu.getByRole('menuitem', { name: 'Page', exact: true }).click();

	const title = 'Lorem ipsum dolor sit';

	await allCatalog.page.getByRole('dialog').getByRole('textbox', { name: 'Title' }).fill(title);
	await allCatalog.page.getByRole('dialog').getByRole('button', { name: 'Save' }).click();

	await expect(allCatalog.overlay.title).toHaveText(title);
	await expect(allCatalog.card(title)).toBeVisible();

	await allCatalog.page.reload();
	await expect(allCatalog.card(title)).toBeVisible();
});
