import { expect, test } from './fixtures';
import { predicates } from '$lib/models';

test.use({ suiteId: 'subscribe' });
test.use({ storageState: 'tests/.auth/bob.json' });

test.describe('Subscribe to programs', () => {
	test.setTimeout(90000);

	test('adopt a public program from another organization and unsubscribe', async ({
		dotsBoard,
		adminContext,
		defaultOrganization,
		testOrganization,
		testOrganizationalUnit,
		testPublicProgram,
		isMobile
	}) => {
		test.skip(isMobile, 'Subscribe button may not be visible on mobile');

		// Give Bob admin role on testOrganizationalUnit so he can subscribe.
		const orgResponse = await adminContext.request.get(`/container/${testOrganization.guid}`);
		const orgData = await orgResponse.json();
		const bobRelation = orgData.user.find(
			(u: { predicate: string }) => u.predicate === predicates.enum['is-member-of']
		);
		const bobGuid = bobRelation.subject;

		const adminResponse = await adminContext.request.post(
			`/container/${testOrganizationalUnit.guid}/user`,
			{
				data: [
					{
						object: testOrganizationalUnit.guid,
						predicate: predicates.enum['is-admin-of'],
						subject: bobGuid
					}
				]
			}
		);
		expect(adminResponse.ok()).toBeTruthy();

		// Navigate to defaultOrganization's board and open the program overlay via hash.
		await dotsBoard.page.goto(
			`/${defaultOrganization.guid}/all/level#view=${testPublicProgram.guid}`
		);
		await dotsBoard.page.waitForLoadState('networkidle');
		await expect(dotsBoard.overlay.title).toHaveText(testPublicProgram.payload.title);

		// The "Adopt" button should be visible since this is a public program from another org
		const adoptButton = dotsBoard.overlay.locator.getByRole('button', { name: 'Adopt' });
		await expect(adoptButton).toBeVisible();

		// Click the adopt button to open the popover
		await adoptButton.click();

		// The popover should show with the heading
		const popover = dotsBoard.page.locator('.popover');
		await expect(popover).toBeVisible();
		await expect(popover.locator('.popover-title')).toContainText('Adopt program for');

		// Expand the testOrganization group if not already expanded
		const groupHeader = popover.getByRole('button', { name: testOrganization.payload.name });
		await expect(groupHeader).toBeVisible();
		const ouCheckbox = popover.getByLabel(testOrganizationalUnit.payload.name);
		if (!(await ouCheckbox.isVisible().catch(() => false))) {
			await groupHeader.click();
		}
		await expect(ouCheckbox).toBeVisible();
		await ouCheckbox.check();
		await expect(ouCheckbox).toBeChecked();

		// Click confirm
		const confirmButton = popover.getByRole('button', { name: 'Confirm selection' });
		await expect(confirmButton).toBeEnabled();
		await confirmButton.click();

		// Wait for the subscription to be processed
		await dotsBoard.page.waitForLoadState('networkidle');

		// Navigate to testOrganizationalUnit's board to see "Adopted" in the correct scope
		await dotsBoard.page.goto(
			`/${testOrganizationalUnit.guid}/all/level#view=${testPublicProgram.guid}`
		);
		await dotsBoard.page.waitForLoadState('networkidle');
		await expect(dotsBoard.overlay.title).toHaveText(testPublicProgram.payload.title);

		// The button should now show "Adopted"
		const adoptedButton = dotsBoard.overlay.locator.getByRole('button', { name: 'Adopted' });
		await expect(adoptedButton).toBeVisible({ timeout: 5000 });

		// Unsubscribe: click the "Adopted" button
		await adoptedButton.click();

		// Wait for unsubscription to process
		await dotsBoard.page.waitForLoadState('networkidle');

		// The button should revert to "Adopt"
		await expect(dotsBoard.overlay.locator.getByRole('button', { name: 'Adopt' })).toBeVisible({
			timeout: 5000
		});
	});
});
