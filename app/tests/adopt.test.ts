import { predicates } from '$lib/models';
import { expect, test } from './fixtures';

test.use({ suiteId: 'adopt' });
test.use({ storageState: 'tests/.auth/bob.json' });

test.describe('Adopt programs', () => {
	test.setTimeout(90000);

	test('adopt a public program for an organizational unit, un-adopt and re-adopt', async ({
		dotsBoard,
		adminContext,
		defaultOrganization,
		testOrganization,
		testOrganizationalUnit,
		testPublicProgram,
		isMobile
	}) => {
		test.skip(isMobile, 'Adopt button may not be visible on mobile');

		// Give Bob admin role on testOrganizationalUnit so he may adopt for it.
		const orgResponse = await adminContext.request.get(`/container/${testOrganization.guid}`);
		const orgData = await orgResponse.json();
		const bobRelation = orgData.user.find(
			(u: { predicate: string }) => u.predicate === predicates.enum['is-member-of']
		);
		const adminResponse = await adminContext.request.post(
			`/container/${testOrganizationalUnit.guid}/user`,
			{
				data: [
					{
						object: testOrganizationalUnit.guid,
						predicate: predicates.enum['is-admin-of'],
						subject: bobRelation.subject
					}
				]
			}
		);
		expect(adminResponse.ok()).toBeTruthy();

		const programOverlayURL = `/${defaultOrganization.guid}/all/level#view=${testPublicProgram.guid}`;
		const adoptButton = dotsBoard.overlay.locator.getByRole('button', {
			name: 'Adopt',
			exact: true
		});
		const adoptedButton = dotsBoard.overlay.locator.getByRole('button', { name: 'Adopted' });
		const dialog = dotsBoard.page.getByRole('dialog');
		const unitCheckbox = dialog.getByLabel(testOrganizationalUnit.payload.name);
		const confirmButton = dialog.getByRole('button', { name: 'Confirm selection' });

		async function openProgramOverlay() {
			await dotsBoard.page.goto(programOverlayURL);
			await dotsBoard.page.reload();
			await expect(dotsBoard.overlay.title).toHaveText(testPublicProgram.payload.title);
		}

		// Adopt the program for the organizational unit.
		await openProgramOverlay();
		await adoptButton.click();
		await expect(dialog.getByRole('heading', { name: 'Adopt program for' })).toBeVisible();
		await unitCheckbox.check();
		await confirmButton.click();
		await expect(dialog).not.toBeVisible();

		await openProgramOverlay();
		await expect(adoptedButton).toBeVisible();

		// Un-adopt by unchecking the organizational unit.
		await adoptedButton.click();
		await expect(unitCheckbox).toBeChecked();
		await unitCheckbox.uncheck();
		await confirmButton.click();
		await expect(dialog).not.toBeVisible();

		await openProgramOverlay();
		await expect(adoptButton).toBeVisible();

		// Re-adopt to make sure an adoption can be restored after removal.
		await adoptButton.click();
		await unitCheckbox.check();
		await confirmButton.click();
		await expect(dialog).not.toBeVisible();

		await openProgramOverlay();
		await expect(adoptedButton).toBeVisible();
	});
});
