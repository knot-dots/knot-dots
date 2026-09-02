import { test, expect } from './fixtures';

test.use({ suiteId: 'user-management-permissions' });

test.describe('Permission matrix', () => {
	test.skip(
		({ browserName }) => browserName !== 'chromium',
		'This suite runs only on Chromium because we are just testing write permissions'
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

		// Without edit mode the matrix is read-only
		for (const kind of ['Read', 'Edit', 'Create', 'Delete', 'Manage users']) {
			await expect(bobRow.getByRole('checkbox', { name: kind })).toBeDisabled();
			await expect(orlaRow.getByRole('checkbox', { name: kind })).toBeDisabled();
		}

		// With edit mode Bob's row unlocks, but the admin row stays locked and
		// unreachable kinds (nobody creates or deletes an organization) stay
		// disabled.
		await page.getByRole('checkbox', { name: 'Edit mode' }).check();
		await expect(bobRow.getByRole('checkbox', { name: 'Edit' })).toBeEnabled();
		await expect(bobRow.getByRole('checkbox', { name: 'Manage users' })).toBeEnabled();
		await expect(bobRow.getByRole('checkbox', { name: 'Create' })).toBeDisabled();
		await expect(bobRow.getByRole('checkbox', { name: 'Delete' })).toBeDisabled();
		for (const kind of ['Read', 'Edit', 'Create', 'Delete', 'Manage users']) {
			await expect(orlaRow.getByRole('checkbox', { name: kind })).toBeDisabled();
		}
	});

	test('toggling a grant snaps to the matching role', async ({ page, testOrganization }) => {
		await page.goto(`/${testOrganization.guid}/user-management?view=permissions`);
		await page.getByRole('checkbox', { name: 'Edit mode' }).check();

		// On an organization container only the head role includes editing, so
		// checking "Edit" promotes Bob straight from observer to head.
		const bobRow = page.getByRole('row', { name: 'Bob Bow' });
		const saveResponse = page.waitForResponse(
			(r) => r.url().includes('/grant') && r.request().method() === 'POST'
		);
		await bobRow.getByRole('checkbox', { name: 'Edit' }).check();
		await saveResponse;
		await expect(bobRow.getByRole('checkbox', { name: 'Manage users' })).toBeChecked();
		await expect(bobRow.getByText('Head')).toBeVisible();

		// The users view reflects the synced role relation — the same write path
		// that fills container_grant.
		await page.getByRole('link', { name: 'Users' }).click();
		await expect(page.getByRole('row', { name: 'Bob Bow' }).getByText('Head')).toBeVisible();

		// Unchecking "Edit" demotes to the largest remaining role without it.
		await page.getByRole('link', { name: 'Permissions' }).click();
		const restoreResponse = page.waitForResponse(
			(r) => r.url().includes('/grant') && r.request().method() === 'POST'
		);
		await bobRow.getByRole('checkbox', { name: 'Edit' }).uncheck();
		await restoreResponse;
		await expect(bobRow.getByText('Observer')).toBeVisible();
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
		await expect(bobRow.getByRole('checkbox', { name: 'Edit' })).not.toBeChecked();
		// the viewer administers the organization, so the matrix is editable here
		await expect(bobRow.getByRole('checkbox', { name: 'Edit' })).toBeEnabled();

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
