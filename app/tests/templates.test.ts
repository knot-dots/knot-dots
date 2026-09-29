import { expect, test } from './fixtures';

test.use({ suiteId: 'templates', storageState: 'tests/.auth/orgadmin.json' });

test('shows global template roots and excludes scoped template hierarchies', async ({
	dotsBoard,
	programReportTemplate,
	reportTemplate,
	testOrganization
}) => {
	await dotsBoard.page.goto(`/${testOrganization.guid}/templates`);

	await expect(
		dotsBoard.page.getByTitle(reportTemplate.payload.title, { exact: true })
	).toBeVisible();
	await expect(
		dotsBoard.page.getByTitle(programReportTemplate.payload.title, { exact: true })
	).toHaveCount(0);
	await expect(
		dotsBoard.page.getByTitle(`${programReportTemplate.payload.title} child`, { exact: true })
	).toHaveCount(0);
});
