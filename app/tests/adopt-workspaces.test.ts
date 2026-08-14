import {
	type Container,
	containerOfType,
	payloadTypes,
	predicates,
	type RulePayload
} from '$lib/models';
import { createContainer, deleteContainer, expect, test } from './fixtures';

test.use({ suiteId: 'adopt-workspaces' });
test.use({ storageState: 'tests/.auth/bob.json' });

test.describe('Adopted content in workspaces', () => {
	test.setTimeout(90000);

	test('adopted programs and their public rules appear in the adopting context', async ({
		page,
		adminContext,
		defaultOrganization,
		testOrganization,
		testOrganizationalUnit,
		testPublicProgram,
		isMobile
	}, testInfo) => {
		test.skip(isMobile, 'Workspace layout differs on mobile');

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

		// Two rules inside the public program: only the public one may surface
		// in the adopting context.
		const newRule = containerOfType(
			payloadTypes.enum.rule,
			defaultOrganization.guid,
			null,
			defaultOrganization.guid,
			'knot-dots'
		) as Container<RulePayload>;
		const publicRule = await createContainer(adminContext, {
			...newRule,
			payload: {
				...newRule.payload,
				title: `Public Rule ${testInfo.workerIndex}`,
				visibility: 'public'
			},
			relation: [
				{
					object: testPublicProgram.guid,
					position: 0,
					predicate: predicates.enum['is-part-of-program']
				}
			]
		});
		const internalRule = await createContainer(adminContext, {
			...newRule,
			payload: {
				...newRule.payload,
				title: `Internal Rule ${testInfo.workerIndex}`,
				visibility: 'organization'
			},
			relation: [
				{
					object: testPublicProgram.guid,
					position: 1,
					predicate: predicates.enum['is-part-of-program']
				}
			]
		});

		const programCard = page.getByTitle(testPublicProgram.payload.title);
		const publicRuleCard = page.getByTitle(publicRule.payload.title);
		const internalRuleCard = page.getByTitle(internalRule.payload.title);
		const filterButton = page.getByRole('button', { name: 'Filter' });

		try {
			// Before adopting, none of the foreign content is part of the unit's
			// workspaces.
			await page.goto(`/${testOrganizationalUnit.guid}/set-of-rules/catalog`);
			await expect(filterButton).toBeVisible();
			await expect(programCard).toHaveCount(0);

			await page.goto(`/${testOrganizationalUnit.guid}/rules/catalog`);
			await expect(filterButton).toBeVisible();
			await expect(publicRuleCard).toHaveCount(0);

			// Adopt as Bob, who administers the unit; the sysadmin deliberately
			// may not adopt.
			const adoptResponse = await page.request.post(
				`/container/${testPublicProgram.guid}/relation`,
				{
					data: [
						{
							object: testOrganizationalUnit.guid,
							position: 0,
							predicate: predicates.enum['is-adopted-by'],
							subject: testPublicProgram.guid
						}
					]
				}
			);
			expect(adoptResponse.ok()).toBeTruthy();

			await page.goto(`/${testOrganizationalUnit.guid}/set-of-rules/catalog`);
			await expect(programCard).toBeVisible();
			// The card shows the responsible organization of the adopted program.
			await expect(programCard.getByTitle(defaultOrganization.payload.name)).toBeVisible();

			await page.goto(`/${testOrganizationalUnit.guid}/rules/catalog`);
			await expect(publicRuleCard).toBeVisible();
			await expect(publicRuleCard.getByTitle(defaultOrganization.payload.name)).toBeVisible();
			await expect(internalRuleCard).toHaveCount(0);

			// Un-adopting removes the content from the workspaces again.
			const unAdoptResponse = await page.request.post(
				`/container/${testPublicProgram.guid}/relation`,
				{
					data: [
						{
							deleted: true,
							object: testOrganizationalUnit.guid,
							position: 0,
							predicate: predicates.enum['is-adopted-by'],
							subject: testPublicProgram.guid
						}
					]
				}
			);
			expect(unAdoptResponse.ok()).toBeTruthy();

			await page.goto(`/${testOrganizationalUnit.guid}/set-of-rules/catalog`);
			await expect(filterButton).toBeVisible();
			await expect(programCard).toHaveCount(0);

			await page.goto(`/${testOrganizationalUnit.guid}/rules/catalog`);
			await expect(filterButton).toBeVisible();
			await expect(publicRuleCard).toHaveCount(0);
		} finally {
			await deleteContainer(adminContext, publicRule);
			await deleteContainer(adminContext, internalRule);
		}
	});
});
