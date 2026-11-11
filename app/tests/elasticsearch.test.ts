import {
	type Container,
	containerOfType,
	type OrganizationalUnitPayload,
	payloadTypes
} from '$lib/models';
import { createContainer, deleteContainer, expect, test } from './fixtures';

test.use({ suiteId: 'elasticsearch' });
test.use({ storageState: 'tests/.auth/orgadmin.json' });

test.describe('Optimistic frontend updates with Elasticsearch', () => {
	test('created goal appears immediately on the board', async ({ dotsBoard, testOrganization }) => {
		await dotsBoard.goto(`/${testOrganization.guid}`);
		await dotsBoard.header.editModeToggle.check();

		const goalTitle = `ES Optimistic Goal ${Date.now()}`;

		await dotsBoard.column('Goals').addItemButton.click();
		const dialog = dotsBoard.page.getByRole('dialog');
		await expect(dialog).toBeVisible();
		await dialog.getByPlaceholder('Title').fill(goalTitle);
		await dialog.getByRole('button', { name: 'Save' }).click();

		// The overlay opens for the newly created goal
		await expect(dotsBoard.overlay.title).toHaveText(goalTitle);
		await dotsBoard.overlay.closeButton.click();

		// The goal card should be visible immediately (optimistic update),
		// even before Elasticsearch has indexed it.
		await expect(dotsBoard.card(goalTitle)).toBeVisible();
	});

	test('updated title is reflected immediately on the board', async ({
		dotsBoard,
		testMeasure
	}) => {
		const updatedTitle = `Updated Measure ${Date.now()}`;

		// Navigate directly to the overlay via URL hash
		await dotsBoard.page.goto(
			`/${testMeasure.organization}/measures/status#view=${testMeasure.guid}`
		);
		await dotsBoard.overlay.editModeToggle.check();

		// Change the title and wait for autosave to persist
		const titleField = dotsBoard.overlay.locator.getByRole('heading', { level: 1 });
		await titleField.fill(updatedTitle);

		// Close the overlay and verify the updated title on the board
		await dotsBoard.overlay.closeButton.click();
		await expect(dotsBoard.card(updatedTitle)).toBeVisible();
	});
});

test.describe('Full-text search with Elasticsearch', () => {
	test('finds organizational units by federal state and official regional code', async ({
		adminContext,
		testOrganization
	}) => {
		const newOrganizationalUnit = containerOfType(
			payloadTypes.enum.organizational_unit,
			testOrganization
		) as Container<OrganizationalUnitPayload>;
		const regionalAssociation = await createContainer(adminContext, {
			...newOrganizationalUnit,
			payload: {
				...newOrganizationalUnit.payload,
				federalState: 'Saarland',
				name: 'Regionalverband',
				officialRegionalCode: '100410100100'
			}
		});
		const municipality = await createContainer(adminContext, {
			...newOrganizationalUnit,
			payload: {
				...newOrganizationalUnit.payload,
				federalState: 'Bremen',
				name: 'Stadtgemeinde',
				officialRegionalCode: '040110000000'
			}
		});

		async function search(terms: string) {
			const response = await adminContext.request.get('/container/v2', {
				params: {
					organization: testOrganization.guid,
					terms,
					type: payloadTypes.enum.organizational_unit
				}
			});
			const { containers } = (await response.json()) as { containers: Container[] };
			return containers.map(({ guid }) => guid);
		}

		try {
			// The federal state, the complete code and its leading digits each
			// find the one organizational unit. Polling gives the indexing
			// worker time to catch up.
			for (const terms of ['Saarland', '100410100100', '10041']) {
				await expect
					.poll(() => search(terms), { timeout: 20000 })
					.toEqual([regionalAssociation.guid]);
			}
		} finally {
			await deleteContainer(adminContext, regionalAssociation);
			await deleteContainer(adminContext, municipality);
		}
	});
});
