import type { AnyPayload, Container } from '$lib/models';
import { expect, test } from './fixtures';

test.use({ suiteId: 'csv-import' });
test.use({ storageState: 'tests/.auth/orgadmin.json' });

test('import CSV creates objects of every type', async ({ page, testOrganization }) => {
	const types = [
		['Aufgabe', 'task'],
		['Maßnahme', 'measure'],
		['Programm', 'program'],
		['Regel', 'rule'],
		['Wissen', 'knowledge'],
		['Ziel', 'goal']
	];
	const titleFor = (label: string) => `Imported ${label}`;

	// Leave the content column empty, as programs have no content, and set no status for
	// knowledge, as it has none
	const csvContent = [
		'Nummer;Objekt;Titel;Inhalt;Status',
		...types.map(
			([label], index) =>
				`${index + 1};${label};${titleFor(label)};;${label == 'Wissen' ? '' : 'Idee'}`
		)
	].join('\n');

	await page.goto(`/${testOrganization.guid}/import`);
	await page.getByLabel('CSV file').setInputFiles({
		name: 'import.csv',
		mimeType: 'text/csv',
		buffer: Buffer.from(csvContent, 'utf-8')
	});

	const response = page.waitForResponse(
		(response) =>
			new URL(response.url()).pathname === `/${testOrganization.guid}/import` &&
			response.request().method() === 'POST'
	);
	await page.getByRole('button', { name: 'Submit', exact: true }).click();
	await response;

	// Verify every row was imported. Query the containers directly, as the catalogs show them
	// only once the search index has caught up.
	const containersResponse = await page.request.get(
		`/container?organization=${testOrganization.guid}`
	);
	const containers: Container<AnyPayload>[] = await containersResponse.json();
	expect(containers.map(({ payload }) => payload)).toEqual(
		expect.arrayContaining(
			types.map(([label, type]) => expect.objectContaining({ title: titleFor(label), type }))
		)
	);
});
