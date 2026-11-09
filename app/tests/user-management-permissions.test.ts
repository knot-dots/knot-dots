import { test, expect } from './fixtures';

test.use({ suiteId: 'user-management-permissions' });

test.describe('Permission matrix', () => {
	test.skip(
		({ browserName }) => browserName !== 'chromium',
		'This suite runs only on Chromium because we are just testing write permissions'
	);

	test.use({ storageState: 'tests/.auth/orgadmin.json' });

	test('shows the stored grants per user', async ({ page, testOrganization }) => {
		await page.goto(`/${testOrganization.guid}/user-management`);
		await page.getByRole('link', { name: 'Permissions' }).click();

		// the stored grants split into rights on the object itself and rights on
		// subordinate objects
		await expect(page.getByRole('columnheader', { name: 'This object' })).toBeVisible();
		await expect(page.getByRole('columnheader', { name: 'Subordinate objects' })).toBeVisible();

		// Outside of edit mode the matrix is a read-only view: icons that name
		// their state instead of checkboxes. An observer may only read.
		const bobRow = page.getByRole('row', { name: 'Bob Bow' });
		await expect(bobRow.getByRole('img', { name: 'Read (This object): granted' })).toBeVisible();
		await expect(
			bobRow.getByRole('img', { name: 'Edit (This object): not granted' })
		).toBeVisible();
		await expect(
			bobRow.getByRole('img', { name: 'Read (Subordinate objects): granted' })
		).toBeVisible();
		await expect(
			bobRow.getByRole('img', { name: 'Create (Subordinate objects): not granted' })
		).toBeVisible();
		await expect(bobRow.getByRole('checkbox')).toHaveCount(0);

		// An admin holds every grant.
		const orlaRow = page.getByRole('row', { name: 'Orla Orchestra' });
		await expect(orlaRow.getByRole('img', { name: 'Read (This object): granted' })).toBeVisible();
		await expect(
			orlaRow.getByRole('img', { name: 'Manage users (This object): granted' })
		).toBeVisible();
		await expect(
			orlaRow.getByRole('img', { name: 'Delete (Subordinate objects): granted' })
		).toBeVisible();
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

	test('edits individual grants and maps them to roles', async ({ page, testOrganization }) => {
		await page.goto(`/${testOrganization.guid}/user-management?view=permissions`);
		await page.getByRole('checkbox', { name: 'Edit mode' }).check();

		// toggling a single kind stores an individual grant set
		const bobRow = page.getByRole('row', { name: 'Bob Bow' });
		const grantResponse = page.waitForResponse(
			(r) => r.url().includes('/grant') && r.request().method() === 'POST'
		);
		await bobRow.getByRole('checkbox', { name: 'Edit (Subordinate objects)' }).check();
		await grantResponse;
		await expect(
			bobRow.getByRole('checkbox', { name: 'Edit (Subordinate objects)' })
		).toBeChecked();
		// the set matches no role, so the role column shows a custom set
		await expect(bobRow.getByRole('button', { name: 'Custom' })).toBeVisible();

		// removing the kind again restores the observer role
		const revertResponse = page.waitForResponse(
			(r) => r.url().includes('/grant') && r.request().method() === 'POST'
		);
		await bobRow.getByRole('checkbox', { name: 'Edit (Subordinate objects)' }).uncheck();
		await revertResponse;
		await expect(bobRow.getByRole('button', { name: 'Observer' })).toBeVisible();

		// the role column assigns the mapped grant set in one step
		const headResponse = page.waitForResponse(
			(r) => r.url().includes('/grant') && r.request().method() === 'POST'
		);
		await bobRow.getByRole('button', { name: 'Observer' }).click();
		// on an organization the administrator role is selectable, a role cannot
		// be removed here
		await expect(page.getByRole('radio', { name: 'Administrator' })).toBeVisible();
		await expect(page.getByRole('radio', { name: 'No role' })).toBeHidden();
		await page.getByRole('radio', { name: 'Head' }).click();
		await headResponse;
		await expect(bobRow.getByRole('checkbox', { name: 'Edit (This object)' })).toBeChecked();
		// heads deliberately do not manage the users of the object itself
		await expect(
			bobRow.getByRole('checkbox', { name: 'Manage users (This object)' })
		).not.toBeChecked();
		await expect(
			bobRow.getByRole('checkbox', { name: 'Create (Subordinate objects)' })
		).toBeChecked();
		await expect(
			bobRow.getByRole('checkbox', { name: 'Delete (Subordinate objects)' })
		).toBeChecked();

		// restore Bob to a plain observer for the remaining tests
		const restoreResponse = page.waitForResponse(
			(r) => r.url().includes('/grant') && r.request().method() === 'POST'
		);
		await bobRow.getByRole('button', { name: 'Head' }).click();
		await page.getByRole('radio', { name: 'Observer' }).click();
		await restoreResponse;
		await expect(
			bobRow.getByRole('checkbox', { name: 'Edit (Subordinate objects)' })
		).not.toBeChecked();

		// one's own row is locked: it is marked, shows its grants read-only and
		// offers no removal, so nobody takes rights from themselves by accident
		const orlaRow = page.getByRole('row', { name: 'Orla Orchestra (you)' });
		await expect(orlaRow.getByRole('img', { name: 'Edit (This object): granted' })).toBeVisible();
		await expect(orlaRow.getByRole('checkbox')).toHaveCount(0);
		await expect(orlaRow.getByRole('button', { name: 'Remove' })).toHaveCount(0);
	});

	test('removes a user from the matrix and invites with suggestions', async ({
		page,
		testOrganization
	}) => {
		await page.goto(`/${testOrganization.guid}/user-management?view=permissions`);
		await page.getByRole('checkbox', { name: 'Edit mode' }).check();

		// remove Bob's grants so that he is registered in the organization but no
		// longer a member and therefore shows up among the suggestions
		const removeResponse = page.waitForResponse(
			(r) => r.url().includes('/grant') && r.request().method() === 'POST'
		);
		await page
			.getByRole('row', { name: 'Bob Bow' })
			.getByRole('button', { name: 'Remove' })
			.click();
		await removeResponse;
		await expect(page.getByRole('row', { name: 'Bob Bow' })).toBeHidden();

		// the add row of the matrix searches teams and registered users inline;
		// the last entry of the list opens the invite dialog
		await page.getByRole('button', { name: 'Add item' }).click();
		await page.getByRole('option', { name: 'Invite a new person by email' }).click();

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

		// The invited user immediately holds the assigned role and its grants
		const bobRow = page.getByRole('row', { name: 'Bob Bow' });
		await expect(bobRow.getByRole('button', { name: 'Collaborator' })).toBeVisible();
		await expect(
			bobRow.getByRole('checkbox', { name: 'Create (Subordinate objects)' })
		).toBeChecked();
	});
});
