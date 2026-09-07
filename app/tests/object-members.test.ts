import { expect, test } from './fixtures';

test.use({ suiteId: 'object-members' });

test.describe('Object members matrix', () => {
	test.skip(
		({ browserName }) => browserName !== 'chromium',
		'This suite runs only on Chromium because we are just testing write permissions'
	);

	test.use({ storageState: 'tests/.auth/orgadmin.json' });

	test('inherits, decouples with copy-on-write and re-inherits', async ({
		page,
		testOrganization,
		testMeasure
	}) => {
		await page.goto(`/${testOrganization.guid}/all/level#members=${testMeasure.guid}`);

		const overlay = page.locator('.overlay');
		// the segmented button hides its radio inputs, so click the label instead
		await overlay.getByText('Matrix', { exact: true }).click();
		await expect(overlay.getByText('Inherited from', { exact: false })).toBeVisible();

		// While inheriting, the scope matrix shows read-only and the own section
		// offers no way to add members.
		const inheritedBob = overlay.getByRole('row', { name: 'Bob Bow' }).first();
		await expect(inheritedBob.getByRole('checkbox', { name: 'Read' })).toBeChecked();
		await expect(inheritedBob.getByRole('checkbox', { name: 'Read' })).toBeDisabled();
		await expect(inheritedBob.getByRole('checkbox', { name: 'Edit objects' })).not.toBeChecked();
		await expect(overlay.getByRole('button', { name: 'Add item' })).toBeDisabled();

		// Decoupling copies the scope matrix — except its administrators — into
		// an editable own matrix.
		await page.getByRole('checkbox', { name: 'Edit mode' }).check();
		const decoupleResponse = page.waitForResponse(
			(r) => r.url().includes('/grant-inheritance') && r.request().method() === 'POST'
		);
		await overlay.getByRole('checkbox', { name: 'Permissions are inherited' }).uncheck();
		await decoupleResponse;

		await expect(overlay.getByRole('row', { name: 'Bob Bow' })).toHaveCount(2);
		const ownBob = overlay.getByRole('row', { name: 'Bob Bow' }).last();
		await expect(ownBob.getByRole('checkbox', { name: 'Read' })).toBeChecked();
		await expect(ownBob.getByRole('checkbox', { name: 'Read' })).toBeEnabled();
		await expect(ownBob.getByRole('button', { name: 'Observer' })).toBeVisible();
		// the scope administrator is not copied into the own matrix
		await expect(overlay.getByRole('row', { name: 'Orla Orchestra' })).toHaveCount(1);
		await expect(overlay.getByRole('button', { name: 'Add item' })).toBeEnabled();

		// Individual grants work on the own matrix and map to roles.
		const grantResponse = page.waitForResponse(
			(r) => r.url().endsWith('/grant') && r.request().method() === 'POST'
		);
		await ownBob.getByRole('checkbox', { name: 'Edit objects' }).check();
		await grantResponse;
		await expect(ownBob.getByRole('button', { name: 'Custom' })).toBeVisible();

		// The administrator role is selectable on the object level.
		await ownBob.getByRole('button', { name: 'Custom' }).click();
		await expect(page.getByRole('radio', { name: 'Administrator' })).toBeVisible();
		const roleResponse = page.waitForResponse(
			(r) => r.url().endsWith('/grant') && r.request().method() === 'POST'
		);
		await page.getByRole('radio', { name: 'Head' }).click();
		await roleResponse;
		await expect(ownBob.getByRole('checkbox', { name: 'Delete objects' })).toBeChecked();

		// Removing a subject clears their row from the own matrix.
		const removeResponse = page.waitForResponse(
			(r) => r.url().endsWith('/grant') && r.request().method() === 'POST'
		);
		await ownBob.getByRole('button', { name: 'Remove' }).click();
		await removeResponse;
		await expect(overlay.getByRole('row', { name: 'Bob Bow' })).toHaveCount(1);

		// Re-enabling inheritance locks the inherited matrix again.
		const inheritResponse = page.waitForResponse(
			(r) => r.url().includes('/grant-inheritance') && r.request().method() === 'POST'
		);
		await overlay.getByRole('checkbox', { name: 'Permissions are inherited' }).check();
		await inheritResponse;
		await expect(
			overlay.getByRole('row', { name: 'Bob Bow' }).first().getByRole('checkbox', { name: 'Read' })
		).toBeDisabled();
		await expect(overlay.getByRole('button', { name: 'Add item' })).toBeDisabled();
	});
});
