import { test, expect } from './fixtures';

test.use({ suiteId: 'user-management-permissions' });

test.describe('Permission matrix', () => {
	test.skip(
		({ browserName }) => browserName !== 'chromium',
		'This suite runs only on Chromium because we are just testing the read-only matrix'
	);

	test.use({ storageState: 'tests/.auth/orgadmin.json' });

	test('shows grants derived from roles in the user management', async ({
		page,
		testOrganization
	}) => {
		await page.goto(`/${testOrganization.guid}/user-management`);
		await page.getByRole('link', { name: 'Permissions' }).click();

		const bobRow = page.getByRole('row', { name: 'Bob Bow' });
		await expect(bobRow.getByRole('checkbox', { name: 'Read' })).toBeChecked();
		await expect(bobRow.getByRole('checkbox', { name: 'Edit' })).not.toBeChecked();
		await expect(bobRow.getByRole('checkbox', { name: 'Create' })).not.toBeChecked();
		await expect(bobRow.getByRole('checkbox', { name: 'Delete' })).not.toBeChecked();
		await expect(bobRow.getByRole('checkbox', { name: 'Manage users' })).not.toBeChecked();

		// Even an admin may not create or delete the organization itself, so the
		// matrix derived from the actual authorization rules only checks read,
		// edit and manage users for Orla on the organization container.
		const orlaRow = page.getByRole('row', { name: 'Orla Orchestra' });
		await expect(orlaRow.getByText('Admin')).toBeVisible();
		await expect(orlaRow.getByRole('checkbox', { name: 'Read' })).toBeChecked();
		await expect(orlaRow.getByRole('checkbox', { name: 'Edit' })).toBeChecked();
		await expect(orlaRow.getByRole('checkbox', { name: 'Create' })).not.toBeChecked();
		await expect(orlaRow.getByRole('checkbox', { name: 'Delete' })).not.toBeChecked();
		await expect(orlaRow.getByRole('checkbox', { name: 'Manage users' })).toBeChecked();

		// The matrix is read-only in this iteration
		for (const kind of ['Read', 'Edit', 'Create', 'Delete', 'Manage users']) {
			await expect(bobRow.getByRole('checkbox', { name: kind })).toBeDisabled();
			await expect(orlaRow.getByRole('checkbox', { name: kind })).toBeDisabled();
		}
	});

	test('shows the matrix as an alternative view on the members page', async ({
		page,
		testOrganization
	}) => {
		await page.goto(`/${testOrganization.guid}/members`);
		// the segmented button hides its radio inputs, so click the label instead
		await page.getByText('Matrix', { exact: true }).click();

		const bobRow = page.getByRole('row', { name: 'Bob Bow' });
		await expect(bobRow.getByRole('checkbox', { name: 'Read' })).toBeChecked();
		await expect(bobRow.getByRole('checkbox', { name: 'Read' })).toBeDisabled();
		await expect(bobRow.getByRole('checkbox', { name: 'Edit' })).not.toBeChecked();

		await page.getByText('List', { exact: true }).click();
		await expect(page.getByRole('combobox').first()).toBeVisible();
	});
});
