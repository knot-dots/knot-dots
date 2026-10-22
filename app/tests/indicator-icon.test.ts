import { expect, test } from './fixtures';

test.use({ suiteId: 'indicator-icon' });
test.use({ storageState: 'tests/.auth/orgadmin.json' });

test('upload, replace and remove an indicator icon', async ({
	indicatorCatalog,
	organizationalUnitWithActualData,
	testIndicator
}) => {
	const { overlay, page } = indicatorCatalog;
	const icon = overlay.locator.locator('.details-header img.logo');
	const svg = (color: string) => ({
		buffer: Buffer.from(
			`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="${color}"/></svg>`
		),
		mimeType: 'image/svg+xml',
		name: 'icon.svg'
	});
	const waitForSave = () =>
		page.waitForResponse((r) => r.url().includes('/revision') && r.request().method() === 'POST');

	await indicatorCatalog.goto(`/${organizationalUnitWithActualData.guid}`);
	await indicatorCatalog.card(testIndicator.payload.title).click();
	await expect(overlay.title).toHaveText(testIndicator.payload.title);
	await expect(icon).toBeHidden();
	await overlay.editModeToggle.check();

	// Upload an icon
	let saveResponse = waitForSave();
	await overlay.locator.locator('.details-header input[type="file"]').setInputFiles(svg('teal'));
	await saveResponse;
	await expect(icon).toBeVisible();
	const firstSource = await icon.getAttribute('src');

	// Replace the icon
	await icon.click();
	saveResponse = waitForSave();
	const fileChooserPromise = page.waitForEvent('filechooser');
	await page.getByRole('button', { name: 'Replace image' }).click();
	await (await fileChooserPromise).setFiles(svg('orange'));
	await saveResponse;
	await expect(icon).not.toHaveAttribute('src', firstSource!);

	// The icon appears on the card and outside of edit mode
	await page.reload();
	await expect(icon).toBeVisible();
	await expect(
		indicatorCatalog.card(testIndicator.payload.title).locator('img.card-icon')
	).toBeVisible();

	// Remove the icon
	await overlay.editModeToggle.check();
	await icon.click();
	saveResponse = waitForSave();
	await page.getByRole('button', { name: 'Remove image' }).click();
	await saveResponse;
	await overlay.editModeToggle.uncheck();
	await expect(icon).toBeHidden();
});

test.describe(() => {
	test.use({ storageState: 'tests/.auth/bob.json' });

	test('collaborator may not change the icon', async ({
		indicatorCatalog,
		organizationalUnitWithActualData,
		testIndicator
	}) => {
		const { overlay } = indicatorCatalog;
		await indicatorCatalog.goto(`/${organizationalUnitWithActualData.guid}`);
		await indicatorCatalog.card(testIndicator.payload.title).click();
		await expect(overlay.title).toHaveText(testIndicator.payload.title);

		await overlay.editModeToggle.check();
		await expect(overlay.locator.getByText('Choose image')).toHaveCount(0);
	});
});
