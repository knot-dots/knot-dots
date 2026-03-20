import { expect, test } from './fixtures';

test.use({ suiteId: 'csv-upload' });
test.use({ storageState: 'tests/.auth/admin.json' });

test('upload CSV creates indicators', async ({ page, testOrganization }) => {
	// Navigate to the indicators table page
	await page.goto(`/${testOrganization.guid}/indicators/table`);

	// Click "CSV Upload" to open the dialog
	await page.getByRole('button', { name: 'CSV Upload' }).click();
	const dialog = page.getByRole('dialog');
	await expect(dialog).toBeVisible();

	// Prepare a minimal CSV file with BOM and semicolon delimiter
	const BOM = '\uFEFF';
	const csvContent = [
		`${BOM}Title;Description;Unit;2010;2011`,
		'CSV Test Indicator A;First test indicator;10;20',
		'CSV Test Indicator B;Second test indicator;15;25'
	].join('\n');

	// Upload the CSV file via the dropzone input (auto-upload)
	const fileInput = dialog.locator('input[type="file"]');
	await fileInput.setInputFiles({
		name: 'test-indicators.csv',
		mimeType: 'text/csv',
		buffer: Buffer.from(csvContent, 'utf-8')
	});

	// Wait for the API response
	await page.waitForResponse((r) => r.url().includes('/upload') && r.ok());

	// Verify dialog closes and success toast appears
	await expect(dialog).not.toBeVisible();
	await expect(page.getByText('Indicators were imported successfully.')).toBeVisible();

	// Verify the indicators appear in the table
	await expect(page.getByText('CSV Test Indicator A')).toBeVisible();
	await expect(page.getByText('CSV Test Indicator B')).toBeVisible();
});
