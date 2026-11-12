import {
	type Container,
	containerOfType,
	type NewContainer,
	type OrganizationalUnitPayload,
	payloadTypes,
	predicates
} from '$lib/models';
import { createContainer, deleteContainer, expect, inviteUser, test } from './fixtures';

test.use({ suiteId: 'user-management-permissions' });

test.describe('Area permission matrix', () => {
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

test.describe('Content permission matrix', () => {
	test.skip(
		({ browserName }) => browserName !== 'chromium',
		'This suite runs only on Chromium because we are just testing write permissions'
	);

	test.use({ storageState: 'tests/.auth/orgadmin.json' });

	test('inherits, decouples into an own matrix and re-inherits', async ({
		page,
		testOrganization,
		testMeasure,
		testProgram
	}) => {
		await page.goto(`/${testOrganization.guid}/all/level#members=${testMeasure.guid}`);

		const overlay = page.locator('.overlay');
		// the segmented button hides its radio inputs, so click the label instead
		await overlay.getByText('Matrix', { exact: true }).click();
		// assigning roles gave the managing program a matrix of its own, so the
		// measure inherits from the program rather than from the organization
		await expect(
			overlay.getByRole('button', { name: `Inherited from ${testProgram.payload.title}` })
		).toBeVisible();

		// Administrators of the organization form a block of their own that
		// holds every kind regardless of the inheritance.
		await expect(overlay.getByRole('button', { name: 'Admins' })).toBeVisible();
		await expect(overlay.getByRole('row', { name: 'Orla Orchestra' })).toHaveCount(1);

		// While inheriting, the effective matrix shows read-only and the own
		// section offers no way to add members. Bob heads the program, so his
		// row carries every subordinate kind. Inherited rows show icons, own
		// rows checkboxes; that tells the two Bob rows apart below.
		const inheritedBob = overlay
			.getByRole('row', { name: 'Bob Bow' })
			.filter({ has: page.getByRole('img', { name: 'Read (This object): granted' }) });
		const ownBob = overlay
			.getByRole('row', { name: 'Bob Bow' })
			.filter({ has: page.getByRole('checkbox', { name: 'Read (This object)' }) });
		await expect(inheritedBob).toHaveCount(1);
		await expect(
			inheritedBob.getByRole('img', { name: 'Read (This object): granted' })
		).toBeVisible();
		await expect(
			inheritedBob.getByRole('img', { name: 'Edit (Subordinate objects): granted' })
		).toBeVisible();
		await expect(inheritedBob.getByRole('checkbox')).toHaveCount(0);
		await expect(overlay.getByRole('button', { name: 'Add item' })).toHaveCount(0);

		// Turning on individual rights copies nothing: the own matrix starts
		// empty while the inherited section keeps applying beside it. Below a
		// program the own rows add to its matrix, so the switch says so.
		await page.getByRole('checkbox', { name: 'Edit mode' }).check();
		const decoupleResponse = page.waitForResponse(
			(r) => r.url().includes('/grant-inheritance') && r.request().method() === 'POST'
		);
		await overlay.getByRole('checkbox', { name: 'Additional rights' }).check();
		await decoupleResponse;

		await expect(ownBob).toHaveCount(0);
		await expect(inheritedBob).toHaveCount(1);
		await expect(overlay.getByRole('button', { name: 'Add item' })).toBeEnabled();

		// the invitation is the last entry of the inline search
		await overlay.getByRole('button', { name: 'Add item' }).click();
		await overlay.getByRole('option', { name: 'Invite a new person by email' }).click();
		const dialog = page.getByRole('dialog');
		await dialog.getByRole('combobox', { name: 'Email' }).fill('bob@example.org');
		await dialog.getByLabel('Role').selectOption('collaborator');
		// the overlay reloads its data once the invitation is through
		const reloadResponse = page.waitForResponse((r) =>
			r.url().includes(`/${testMeasure.guid}/all/members/__data.json`)
		);
		await dialog.getByRole('button', { name: 'Send invitation' }).click();
		await reloadResponse;

		await expect(ownBob).toHaveCount(1);
		await expect(ownBob.getByRole('checkbox', { name: 'Read (This object)' })).toBeChecked();
		await expect(ownBob.getByRole('checkbox', { name: 'Read (This object)' })).toBeEnabled();
		await expect(ownBob.getByRole('button', { name: 'Collaborator' })).toBeVisible();

		// Individual grants work on the own matrix and map to roles.
		const grantResponse = page.waitForResponse(
			(r) => r.url().endsWith('/grant') && r.request().method() === 'POST'
		);
		await ownBob.getByRole('checkbox', { name: 'Delete (Subordinate objects)' }).uncheck();
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
		await expect(
			ownBob.getByRole('checkbox', { name: 'Delete (Subordinate objects)' })
		).toBeChecked();

		// Removing a subject clears their row from the own matrix.
		const removeResponse = page.waitForResponse(
			(r) => r.url().endsWith('/grant') && r.request().method() === 'POST'
		);
		await ownBob.getByRole('button', { name: 'Remove' }).click();
		await removeResponse;
		await expect(ownBob).toHaveCount(0);
		await expect(inheritedBob).toHaveCount(1);

		// Turning individual rights off leaves only the inherited matrix.
		const inheritResponse = page.waitForResponse(
			(r) => r.url().includes('/grant-inheritance') && r.request().method() === 'POST'
		);
		await overlay.getByRole('checkbox', { name: 'Additional rights' }).uncheck();
		await inheritResponse;
		await expect(inheritedBob).toHaveCount(1);
		await expect(overlay.getByRole('button', { name: 'Add item' })).toHaveCount(0);
	});
});

test.describe('Unit permission matrix', () => {
	test.skip(
		({ browserName }) => browserName !== 'chromium',
		'This suite runs only on Chromium because we are just testing write permissions'
	);

	test.use({ storageState: 'tests/.auth/orgadmin.json' });

	test('removes a person who also works in a unit below', async ({
		adminContext,
		page,
		testOrganization,
		testOrganizationalUnit
	}) => {
		// Bob works in the unit and in a unit below it. The user table lists
		// him for both, the matrix of the unit holds his row there alone.
		const newUnitBelow = containerOfType(
			payloadTypes.enum.organizational_unit,
			testOrganization
		) as NewContainer<OrganizationalUnitPayload>;
		const unitBelow = await createContainer(adminContext, {
			...newUnitBelow,
			payload: {
				...newUnitBelow.payload,
				level: testOrganizationalUnit.payload.level + 1,
				name: 'Unit below'
			},
			relation: [
				{
					object: testOrganizationalUnit.guid,
					position: 0,
					predicate: predicates.enum['is-part-of']
				}
			]
		});
		await inviteUser(adminContext, 'bob@example.org', testOrganizationalUnit);
		await inviteUser(adminContext, 'bob@example.org', unitBelow);

		try {
			await page.goto(`/${testOrganizationalUnit.guid}/user-management?view=permissions`);
			await page.getByRole('checkbox', { name: 'Edit mode' }).check();

			// the invitation gave the unit a matrix of its own, so the switch is on
			// and the own rows are editable right away
			await expect(page.getByRole('checkbox', { name: 'Individual rights' })).toBeChecked();

			// Bob shows up in the inherited section as well, so tell his own row
			// apart by its checkboxes
			const ownBob = page
				.getByRole('row', { name: 'Bob Bow' })
				.filter({ has: page.getByRole('checkbox', { name: 'Read (This object)' }) });
			await expect(ownBob).toHaveCount(1);

			const removeResponse = page.waitForResponse(
				(r) => r.url().endsWith('/grant') && r.request().method() === 'POST'
			);
			await ownBob.getByRole('button', { name: 'Remove' }).click();
			await removeResponse;
			await expect(ownBob).toHaveCount(0);

			// his role in the unit below stays, so the user table still lists him
			await page.goto(`/${testOrganizationalUnit.guid}/user-management`);
			await expect(page.getByRole('row', { name: 'Bob Bow' })).toBeVisible();
		} finally {
			await deleteContainer(adminContext, unitBelow);
		}
	});
});

test.describe('Teams', () => {
	test.skip(
		({ browserName }) => browserName !== 'chromium',
		'This suite runs only on Chromium because we are just testing write permissions'
	);

	test.use({ storageState: 'tests/.auth/orgadmin.json' });

	test('creates a team below the selected unit', async ({
		adminContext,
		page,
		testOrganizationalUnit
	}) => {
		await page.goto(`/${testOrganizationalUnit.guid}/user-management?view=teams`);
		await page.getByRole('button', { name: 'Create team' }).click();

		// the new row proposes the selected unit as the area of the team
		await expect(page.getByRole('button', { name: 'Belongs to' })).toHaveText(
			testOrganizationalUnit.payload.name
		);
		const createdResponse = page.waitForResponse(
			(r) => r.url().endsWith('/container') && r.request().method() === 'POST'
		);
		await page.getByRole('textbox', { name: 'Name of the team' }).fill('Unit team');
		await page.getByRole('textbox', { name: 'Name of the team' }).press('Enter');
		const team = (await (await createdResponse).json()) as Container<OrganizationalUnitPayload>;

		try {
			// the team lists under the unit instead of under the organization
			const row = page.getByRole('row', { name: 'Unit team' });
			await expect(row).toBeVisible();
			await expect(row).toContainText(testOrganizationalUnit.payload.name);
		} finally {
			await deleteContainer(adminContext, team);
		}
	});
});
