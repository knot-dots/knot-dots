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
		// kinds without an effect of their own on an organization stay disabled:
		// nobody creates or deletes an organization, and editing its profile is
		// tied to managing its members rather than to the update kind.
		await page.getByRole('checkbox', { name: 'Edit mode' }).check();
		await expect(bobRow.getByRole('checkbox', { name: 'Read' })).toBeEnabled();
		await expect(bobRow.getByRole('checkbox', { name: 'Manage users' })).toBeEnabled();
		await expect(bobRow.getByRole('checkbox', { name: 'Edit' })).toBeDisabled();
		await expect(bobRow.getByRole('checkbox', { name: 'Create' })).toBeDisabled();
		await expect(bobRow.getByRole('checkbox', { name: 'Delete' })).toBeDisabled();
		for (const kind of ['Read', 'Edit', 'Create', 'Delete', 'Manage users']) {
			await expect(orlaRow.getByRole('checkbox', { name: kind })).toBeDisabled();
		}
	});

	test('toggling a grant changes exactly that kind', async ({ page, testOrganization }) => {
		await page.goto(`/${testOrganization.guid}/user-management?view=permissions`);
		await page.getByRole('checkbox', { name: 'Edit mode' }).check();

		// Checking "Manage users" adds exactly the manage-members kind; the badge
		// keeps showing the role shorthand derived from the granted kinds, so Bob
		// may now invite users while remaining an observer. Editing the
		// organization profile is tied to managing its members, so "Edit" lights
		// up as an effective permission without being individually toggleable.
		const bobRow = page.getByRole('row', { name: 'Bob Bow' });
		const saveResponse = page.waitForResponse(
			(r) => r.url().includes('/grant') && r.request().method() === 'POST'
		);
		await bobRow.getByRole('checkbox', { name: 'Manage users' }).check();
		await saveResponse;
		await expect(bobRow.getByRole('checkbox', { name: 'Manage users' })).toBeChecked();
		await expect(bobRow.getByRole('checkbox', { name: 'Edit' })).toBeChecked();
		await expect(bobRow.getByRole('checkbox', { name: 'Edit' })).toBeDisabled();
		await expect(bobRow.getByText('Observer')).toBeVisible();

		// Assigning a role in the users view resets the kinds to the role's chain.
		await page.getByRole('link', { name: 'Users' }).click();
		const roleResponse = page.waitForResponse(
			(r) => r.url().includes('/user') && r.request().method() === 'POST'
		);
		await page
			.getByRole('row', { name: 'Bob Bow' })
			.getByRole('button', { name: 'Observer' })
			.click();
		await page.getByRole('radio', { name: 'Head' }).click();
		await roleResponse;
		await page.getByRole('link', { name: 'Permissions' }).click();
		await expect(bobRow.getByRole('checkbox', { name: 'Manage users' })).toBeChecked();
		await expect(bobRow.getByText('Head')).toBeVisible();

		// Unchecking "Manage users" removes exactly that kind: the remaining
		// chain kinds survive in storage (the badge falls back to collaborator),
		// and "Edit" goes dark because organization profile editing was granted
		// through manage-members, not through the update kind.
		const removeResponse = page.waitForResponse(
			(r) => r.url().includes('/grant') && r.request().method() === 'POST'
		);
		await bobRow.getByRole('checkbox', { name: 'Manage users' }).uncheck();
		await removeResponse;
		await expect(bobRow.getByRole('checkbox', { name: 'Manage users' })).not.toBeChecked();
		await expect(bobRow.getByRole('checkbox', { name: 'Edit' })).not.toBeChecked();
		await expect(bobRow.getByText('Collaborator')).toBeVisible();

		// Restore Bob to a plain observer for the remaining tests.
		await page.getByRole('link', { name: 'Users' }).click();
		const restoreResponse = page.waitForResponse(
			(r) => r.url().includes('/user') && r.request().method() === 'POST'
		);
		await page
			.getByRole('row', { name: 'Bob Bow' })
			.getByRole('button', { name: 'Collaborator' })
			.click();
		await page.getByRole('radio', { name: 'Observer' }).click();
		await restoreResponse;
		await page.getByRole('link', { name: 'Permissions' }).click();
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
		await expect(bobRow.getByRole('checkbox', { name: 'Manage users' })).toBeEnabled();

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
		await expect(dialog.locator('datalist option[value="bob@example.org"]')).toBeAttached();
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
