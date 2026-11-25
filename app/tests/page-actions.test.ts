import { expect, test } from './fixtures';
import Header from './header';

test.use({ suiteId: 'page-actions' });

test.describe('as organization admin', () => {
	test.use({ storageState: 'tests/.auth/orgadmin.json' });

	test('a page offers the actions its author enabled', async ({ page, testPage }) => {
		const header = new Header(page);

		await page.goto(`/${testPage.organization}/${testPage.guid}`);
		await expect(
			page.getByRole('heading', { level: 1, name: testPage.payload.title })
		).toBeVisible();
		await expect(header.reviewButton).toBeHidden();
		await expect(header.compareButton).toBeHidden();

		await test.step('the actions are settings of the edit mode', async () => {
			await header.openSettingsMenu();
			await expect(header.pageActionToggle('Show review')).toBeHidden();
			await expect(header.pageActionToggle('Show comparison')).toBeHidden();
			await page.keyboard.press('Escape');
		});

		await test.step('enable the comparison only', async () => {
			await header.editModeToggle.check();
			await header.openSettingsMenu();
			await header.togglePageAction('Show comparison');
			await expect(header.compareButton).toBeVisible();
			await expect(header.reviewButton).toBeHidden();
		});

		await test.step('the setting is saved', async () => {
			await page.reload();
			await expect(header.compareButton).toBeVisible();
			await expect(header.reviewButton).toBeHidden();
		});

		await test.step('swap the comparison for the review', async () => {
			await header.editModeToggle.check();
			await header.openSettingsMenu();
			await header.pageActionToggle('Show review').click();
			await header.togglePageAction('Show comparison');
			await expect(header.reviewButton).toBeVisible();
			await expect(header.compareButton).toBeHidden();

			await page.reload();
			await expect(header.reviewButton).toBeVisible();
			await expect(header.compareButton).toBeHidden();
		});
	});

	test('reports and indicators still offer both actions', async ({
		page,
		testOrganization,
		testReport
	}) => {
		const header = new Header(page);

		await page.goto(`/${testReport.organization}/${testReport.guid}`);
		await expect(header.reviewButton).toBeVisible();
		await expect(header.compareButton).toBeVisible();

		await page.goto(`/${testOrganization.guid}/indicators/catalog`);
		await expect(header.reviewButton).toBeVisible();
		await expect(header.compareButton).toBeVisible();
	});
});

test.describe('as a user who may not update the page', () => {
	test.use({ storageState: 'tests/.auth/bob.json' });

	test('uses the enabled actions without changing them', async ({
		page,
		testPublicPageWithActions
	}) => {
		const header = new Header(page);

		await page.goto(`/${testPublicPageWithActions.organization}/${testPublicPageWithActions.guid}`);
		await expect(header.reviewButton).toBeVisible();
		await expect(header.compareButton).toBeVisible();

		await header.editModeToggle.check();
		await header.openSettingsMenu();
		await expect(header.pageActionToggle('Show review')).toBeHidden();
		await expect(header.pageActionToggle('Show comparison')).toBeHidden();
	});
});
