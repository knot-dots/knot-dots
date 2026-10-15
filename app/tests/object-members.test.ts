import { expect, test } from './fixtures';

test.use({ suiteId: 'object-members' });

test.describe('Object members matrix', () => {
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
		// row carries every subordinate kind.
		const inheritedBob = overlay.getByRole('row', { name: 'Bob Bow' });
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
		// empty, the inherited section stops applying and folds away.
		await page.getByRole('checkbox', { name: 'Edit mode' }).check();
		const decoupleResponse = page.waitForResponse(
			(r) => r.url().includes('/grant-inheritance') && r.request().method() === 'POST'
		);
		await overlay.getByRole('checkbox', { name: 'Individual rights' }).check();
		await decoupleResponse;

		await expect(overlay.getByRole('row', { name: 'Bob Bow' })).toHaveCount(0);
		await expect(overlay.getByRole('button', { name: 'Add item' })).toBeEnabled();

		await overlay.getByRole('button', { name: 'Add item' }).click();
		const dialog = page.getByRole('dialog');
		await dialog.getByRole('combobox', { name: 'Email' }).fill('bob@example.org');
		await dialog.getByLabel('Role').selectOption('collaborator');
		// the overlay reloads its data once the invitation is through
		const reloadResponse = page.waitForResponse((r) =>
			r.url().includes(`/${testMeasure.guid}/all/members/__data.json`)
		);
		await dialog.getByRole('button', { name: 'Send invitation' }).click();
		await reloadResponse;

		const ownBob = overlay.getByRole('row', { name: 'Bob Bow' });
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
		await expect(overlay.getByRole('row', { name: 'Bob Bow' })).toHaveCount(0);

		// Turning individual rights off lets the inherited matrix apply again.
		const inheritResponse = page.waitForResponse(
			(r) => r.url().includes('/grant-inheritance') && r.request().method() === 'POST'
		);
		await overlay.getByRole('checkbox', { name: 'Individual rights' }).uncheck();
		await inheritResponse;
		await expect(
			overlay
				.getByRole('row', { name: 'Bob Bow' })
				.getByRole('img', { name: 'Read (This object): granted' })
		).toBeVisible();
		await expect(overlay.getByRole('button', { name: 'Add item' })).toHaveCount(0);
	});
});
