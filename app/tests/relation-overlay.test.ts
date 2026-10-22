import { predicates } from '../src/lib/models';
import { expect, test } from './fixtures';

test.use({ suiteId: 'relation-overlay' });

test.describe('Relation overlay', () => {
	test.use({ storageState: 'tests/.auth/orgadmin.json' });

	test('shows objects related to a program after reload', async ({
		adminContext,
		dotsBoard,
		testGoal,
		testMeasure,
		testProgram
	}) => {
		const response = await adminContext.request.post(`/container/${testProgram.guid}/relation`, {
			data: [
				{
					object: testProgram.guid,
					position: 0,
					predicate: predicates.enum['is-consistent-with'],
					subject: testGoal.guid
				}
			]
		});
		expect(response.ok()).toBeTruthy();

		await dotsBoard.page.goto(
			`/${testProgram.organization}/all/level#relations=${testProgram.guid}`
		);

		const dropZone = dotsBoard.overlay.locator.locator('.drop-zone--is-consistent-with');
		await expect(
			dropZone.getByRole('article').filter({ hasText: testGoal.payload.title })
		).toBeVisible();

		// Content of the program is not related to it in any of the shown ways.
		await expect(
			dotsBoard.overlay.locator.getByRole('article').filter({ hasText: testMeasure.payload.title })
		).toHaveCount(0);
	});
});
