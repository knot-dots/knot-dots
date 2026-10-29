import {
	type Container,
	containerOfType,
	type IndicatorPayload,
	payloadTypes,
	visibility
} from '../src/lib/models';
import { createContainer, deleteContainer, expect, test as base } from './fixtures';

const test = base.extend<{
	foreignIndicator: Container<IndicatorPayload>;
	unitIndicator: Container<IndicatorPayload>;
}>({
	foreignIndicator: async ({ adminContext, defaultOrganization }, use, workerInfo) => {
		const newIndicator = containerOfType(
			payloadTypes.enum.indicator,
			defaultOrganization
		) as Container<IndicatorPayload>;
		const foreignIndicator = await createContainer(adminContext, {
			...newIndicator,
			payload: {
				...newIndicator.payload,
				title: `Foreign Indicator ${workerInfo.workerIndex}`,
				unit: 'unit.km',
				visibility: visibility.enum.public
			}
		});

		await use(foreignIndicator);

		await deleteContainer(adminContext, foreignIndicator);
	},
	unitIndicator: async ({ adminContext, testOrganizationalUnit }, use, workerInfo) => {
		const newIndicator = containerOfType(
			payloadTypes.enum.indicator,
			testOrganizationalUnit
		) as Container<IndicatorPayload>;
		const unitIndicator = await createContainer(adminContext, {
			...newIndicator,
			payload: {
				...newIndicator.payload,
				title: `Unit Indicator ${workerInfo.workerIndex}`,
				unit: 'unit.km'
			}
		});

		await use(unitIndicator);

		await deleteContainer(adminContext, unitIndicator);
	}
});

test.use({ suiteId: 'indicator-suggestion-organization-filter' });

test.describe('Indicator picker for objectives and effects', () => {
	test.use({ storageState: 'tests/.auth/orgadmin.json' });

	test('can be restricted to indicators of the current organization', async ({
		dotsBoard,
		foreignIndicator,
		isMobile,
		testGoal,
		testIndicator,
		unitIndicator
	}) => {
		test.skip(isMobile, 'Workspace menu is not visible on mobile');

		await dotsBoard.goto(`/${testGoal.organization}`);
		await dotsBoard.card(testGoal.payload.title).click();
		await dotsBoard.overlay.editModeToggle.check();
		await dotsBoard.overlay.locator.getByRole('button', { name: 'All', exact: true }).click();
		await dotsBoard.overlay.locator.getByRole('menuitem', { name: 'IOOI', exact: true }).click();
		await expect(dotsBoard.overlay.locator.getByText('Output')).toBeVisible();
		await dotsBoard.overlay.fullScreenButton.click();
		await dotsBoard.column('Output').addItemButton.click();

		const dialog = dotsBoard.page.getByRole('dialog');
		const option = (container: Container<IndicatorPayload>) =>
			dialog.getByRole('radio', { name: container.payload.title, exact: true });
		await expect(dialog.getByRole('navigation')).toContainText('Select indicator');

		// Without restriction indicators of every organization are offered
		await expect(option(foreignIndicator)).toBeVisible();
		await expect(option(testIndicator)).toBeVisible();
		await expect(option(unitIndicator)).toBeVisible();

		await dialog.getByRole('button', { name: 'Organization', exact: true }).click();
		await dialog.getByRole('radio', { name: 'Current organization' }).check();

		await expect(option(foreignIndicator)).not.toBeVisible();
		await expect(option(testIndicator)).toBeVisible();
		await expect(option(unitIndicator)).toBeVisible();

		await dialog.getByRole('checkbox', { name: 'Without organizational units' }).check();

		await expect(option(testIndicator)).toBeVisible();
		await expect(option(unitIndicator)).not.toBeVisible();
	});
});
