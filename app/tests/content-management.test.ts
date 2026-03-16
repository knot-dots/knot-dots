import path from 'node:path';
import { expect, test } from './fixtures';

test.use({ suiteId: 'content-management' });
test.use({ storageState: 'tests/.auth/admin.json' });

test('stage', async ({ page, testOrganization }) => {
	await page.goto(`/${testOrganization.guid}/all/page`);
	await page.getByRole('checkbox', { name: 'Edit mode' }).check();

	const fileChooserPromise = page.waitForEvent('filechooser');
	await page.getByRole('button', { name: 'Add cover' }).click();
	const fileChooser = await fileChooserPromise;
	await fileChooser.setFiles(path.resolve(import.meta.dirname, 'cover.jpeg'));

	await page.getByRole('dialog').getByRole('button', { name: 'Upload' }).click();
	await expect(page.getByRole('dialog')).not.toBeVisible();
	await expect(page.getByRole('img', { name: 'Cover' })).toBeVisible();
});
