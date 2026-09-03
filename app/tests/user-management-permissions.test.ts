import { test, expect } from './fixtures';

test.use({ suiteId: 'user-management-permissions' });

test.describe('Permission matrix', () => {
	test.skip(
		({ browserName }) => browserName !== 'chromium',
		'This suite runs only on Chromium because we are just testing write permissions'
	);

	test.use({ storageState: 'tests/.auth/orgadmin.json' });

	test('shows the effective rights split by object and subordinate objects', async ({
		page,
		testOrganization
	}) => {
		await page.goto(`/${testOrganization.guid}/user-management`);
		await page.getByRole('link', { name: 'Permissions' }).click();

		// column groups for the object itself and its subordinate objects
		await expect(page.getByRole('columnheader', { name: 'This object' })).toBeVisible();
		await expect(page.getByRole('columnheader', { name: 'Subordinate objects' })).toBeVisible();

		// An observer may only read the organization and nothing below it.
		const bobRow = page.getByRole('row', { name: 'Bob Bow' });
		await expect(bobRow.getByRole('checkbox', { name: 'Read (This object)' })).toBeChecked();
		await expect(bobRow.getByRole('checkbox', { name: 'Edit (This object)' })).not.toBeChecked();
		await expect(bobRow.getByRole('checkbox', { name: 'Delete (This object)' })).not.toBeChecked();
		await expect(
			bobRow.getByRole('checkbox', { name: 'Manage users (This object)' })
		).not.toBeChecked();
		await expect(
			bobRow.getByRole('checkbox', { name: 'Create (Subordinate objects)' })
		).not.toBeChecked();
		await expect(
			bobRow.getByRole('checkbox', { name: 'Delete (Subordinate objects)' })
		).not.toBeChecked();

		// An admin manages the organization itself (without deleting it) and has
		// full rights on subordinate objects.
		const orlaRow = page.getByRole('row', { name: 'Orla Orchestra' });
		await expect(orlaRow.getByText('Admin')).toBeVisible();
		await expect(orlaRow.getByRole('checkbox', { name: 'Read (This object)' })).toBeChecked();
		await expect(orlaRow.getByRole('checkbox', { name: 'Edit (This object)' })).toBeChecked();
		await expect(orlaRow.getByRole('checkbox', { name: 'Delete (This object)' })).not.toBeChecked();
		await expect(
			orlaRow.getByRole('checkbox', { name: 'Manage users (This object)' })
		).toBeChecked();
		await expect(
			orlaRow.getByRole('checkbox', { name: 'Create (Subordinate objects)' })
		).toBeChecked();
		await expect(
			orlaRow.getByRole('checkbox', { name: 'Edit (Subordinate objects)' })
		).toBeChecked();
		await expect(
			orlaRow.getByRole('checkbox', { name: 'Delete (Subordinate objects)' })
		).toBeChecked();

		// the matrix is a read-only view
		await expect(bobRow.getByRole('checkbox', { name: 'Read (This object)' })).toBeDisabled();
		await expect(
			orlaRow.getByRole('checkbox', { name: 'Create (Subordinate objects)' })
		).toBeDisabled();
	});

	test('shows the matrix as an alternative view on the members page', async ({
		page,
		testOrganization
	}) => {
		await page.goto(`/${testOrganization.guid}/members`);
		// the segmented button hides its radio inputs, so click the label instead
		await page.getByText('Matrix', { exact: true }).click();

		const bobRow = page.getByRole('row', { name: 'Bob Bow' });
		await expect(bobRow.getByRole('checkbox', { name: 'Read (This object)' })).toBeChecked();
		await expect(bobRow.getByRole('checkbox', { name: 'Edit (This object)' })).not.toBeChecked();

		await page.getByText('List', { exact: true }).click();
		await expect(page.getByRole('combobox').first()).toBeVisible();
	});

	test('invites a user with a role and suggests registered addresses', async ({
		page,
		testOrganization
	}) => {
		await page.goto(`/${testOrganization.guid}/user-management`);

		// remove Bob's role so that he is registered in the organization but no
		// longer a member and therefore shows up among the suggestions
		await page.getByRole('checkbox', { name: 'Edit mode' }).check();
		const removeResponse = page.waitForResponse(
			(r) => r.url().includes('/user') && r.request().method() === 'POST'
		);
		await page
			.getByRole('row', { name: 'Bob Bow' })
			.getByRole('button', { name: 'Observer' })
			.click();
		await page.getByRole('radio', { name: 'No role' }).click();
		await removeResponse;
		await expect(page.getByRole('row', { name: 'Bob Bow' })).toBeHidden();

		await page.getByRole('button', { name: 'Invite member' }).click();

		const dialog = page.getByRole('dialog');
		const emailInput = dialog.getByRole('combobox', { name: 'Email' });
		await emailInput.click();
		// the suggestions carry the person's name as label, so typing a name
		// suggests the matching address
		await expect(dialog.locator('datalist option[value="bob@example.org"]')).toHaveText('Bob Bow');
		// members are filtered from the suggestions
		await expect(dialog.locator('datalist option[value="orla@example.org"]')).not.toBeAttached();

		await emailInput.fill('bob@example.org');
		await dialog.getByLabel('Role').selectOption('collaborator');
		const inviteResponse = page.waitForResponse(
			(r) => r.url().endsWith('/user') && r.request().method() === 'POST'
		);
		await dialog.getByRole('button', { name: 'Send invitation' }).click();
		await inviteResponse;

		// The invited user immediately holds the assigned role
		await expect(
			page.getByRole('row', { name: 'Bob Bow' }).getByText('Collaborator')
		).toBeVisible();
	});
});
