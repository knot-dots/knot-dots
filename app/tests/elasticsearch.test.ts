import type { BrowserContext } from '@playwright/test';
import {
	type Container,
	containerOfType,
	type GoalPayload,
	type OrganizationalUnitPayload,
	type OrganizationPayload,
	type PayloadType,
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

// Searches through the endpoint backed by Elasticsearch. Callers poll the
// result to give the indexing worker time to catch up.
async function search(
	context: BrowserContext,
	organization: Container<OrganizationPayload>,
	type: PayloadType,
	terms: string
) {
	const response = await context.request.get('/container/v2', {
		params: { organization: organization.guid, terms, type }
	});
	const { containers } = (await response.json()) as { containers: Container[] };
	return containers.map(({ guid }) => guid);
}

test.describe('Full-text search with Elasticsearch', () => {
	test('finds administrative areas by their basic data', async ({
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
				cityAndMunicipalityTypeBBSR: 'Großstadt',
				federalState: 'Saarland',
				name: 'Regionalverband',
				officialMunicipalityKey: '10041100',
				officialRegionalCode: '100410100100'
			}
		});
		const municipality = await createContainer(adminContext, {
			...newOrganizationalUnit,
			payload: {
				...newOrganizationalUnit.payload,
				cityAndMunicipalityTypeBBSR: 'Mittelstadt',
				federalState: 'Bremen',
				name: 'Stadtgemeinde',
				officialMunicipalityKey: '04011000',
				officialRegionalCode: '040110000000'
			}
		});

		try {
			// The federal state, the municipality type, the complete regional
			// code or municipality key and their leading digits each find the
			// one organizational unit.
			for (const terms of ['Saarland', 'Großstadt', '100410100100', '10041100', '10041']) {
				await expect
					.poll(
						() =>
							search(adminContext, testOrganization, payloadTypes.enum.organizational_unit, terms),
						{ timeout: 20000 }
					)
					.toEqual([regionalAssociation.guid]);
			}
		} finally {
			await deleteContainer(adminContext, regionalAssociation);
			await deleteContainer(adminContext, municipality);
		}
	});

	test('finds goals by their summary', async ({ adminContext, testOrganization }) => {
		const newGoal = containerOfType(
			payloadTypes.enum.goal,
			testOrganization
		) as Container<GoalPayload>;
		const goal = await createContainer(adminContext, {
			...newGoal,
			payload: {
				...newGoal.payload,
				summary: 'Versiegelte Schulhöfe werden begrünt',
				title: 'Klimaanpassung'
			}
		});
		const otherGoal = await createContainer(adminContext, {
			...newGoal,
			payload: { ...newGoal.payload, title: 'Nahverkehr' }
		});

		try {
			await expect
				.poll(() => search(adminContext, testOrganization, payloadTypes.enum.goal, 'Schulhöfe'), {
					timeout: 20000
				})
				.toEqual([goal.guid]);
		} finally {
			await deleteContainer(adminContext, goal);
			await deleteContainer(adminContext, otherGoal);
		}
	});
});
