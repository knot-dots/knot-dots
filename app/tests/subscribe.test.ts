import { expect, test } from './fixtures';
import { predicates } from '$lib/models';

test.use({ suiteId: 'subscribe' });
test.use({ storageState: 'tests/.auth/bob.json' });

test.describe('Subscribe to programs', () => {
	test('adopt a public program from another organization and unsubscribe', async ({
		dotsBoard,
		adminContext,
		defaultOrganization,
		testOrganization,
		testPublicProgram,
		isMobile
	}) => {
		test.skip(isMobile, 'Subscribe button may not be visible on mobile');

		// Give Bob admin role on testOrganization so allowedOrgs is populated.
		const orgResponse = await adminContext.request.get(`/container/${testOrganization.guid}`);
		const orgData = await orgResponse.json();
		const bobRelation = orgData.user.find(
			(u: { predicate: string }) => u.predicate === predicates.enum['is-member-of']
		);
		const bobGuid = bobRelation.subject;

		await adminContext.request.post(`/container/${testOrganization.guid}/user`, {
			data: [
				{
					object: testOrganization.guid,
					predicate: predicates.enum['is-admin-of'],
					subject: bobGuid
				},
				{
					object: testOrganization.guid,
					predicate: predicates.enum['is-member-of'],
					subject: bobGuid
				}
			]
		});

		// Navigate to defaultOrganization's board where the public program is listed as a card.
		await dotsBoard.page.goto(`/${defaultOrganization.guid}/all/level`);
		await dotsBoard.page.waitForLoadState('networkidle');

		// Click the program card to open the overlay.
		await dotsBoard.card(testPublicProgram.payload.title).click();
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

		// Select testOrganization in the list
		const orgCheckbox = popover.getByLabel(testOrganization.payload.name);
		await orgCheckbox.check();
		await expect(orgCheckbox).toBeChecked();

		// Click confirm
		const confirmButton = popover.getByRole('button', { name: 'Confirm selection' });
		await expect(confirmButton).toBeEnabled();
		await confirmButton.click();

		// Wait for the subscription to be processed
		await dotsBoard.page.waitForLoadState('networkidle');

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
