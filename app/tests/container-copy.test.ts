import { expect, test } from './fixtures';

test.use({ suiteId: 'container-copy' });
test.use({ storageState: 'tests/.auth/orgadmin.json' });

test('copies an edited program root and its descendants through the dedicated endpoint', async ({
	dotsBoard,
	testMeasure,
	testProgram
}) => {
	await dotsBoard.goto(`/${testProgram.organization}`);
	await dotsBoard.card(testProgram.payload.title).click();
	await expect(dotsBoard.overlay.title).toHaveText(testProgram.payload.title);
	await dotsBoard.overlay.editModeToggle.check();

	await dotsBoard.overlay.locator.getByRole('button', { name: 'Copy', exact: true }).click();
	const dialog = dotsBoard.page.getByRole('dialog');
	const title = `Copied ${testProgram.payload.title}`;
	await dialog.getByRole('textbox', { name: 'Title' }).fill(title);
	const copyResponsePromise = dotsBoard.page.waitForResponse(
		(response) =>
			response.url().endsWith('/container/copy') && response.request().method() === 'POST'
	);
	await dialog.getByRole('button', { name: 'Save' }).click();
	const copyResponse = await copyResponsePromise;

	expect(copyResponse.status()).toBe(201);
	const request = copyResponse.request().postDataJSON();
	expect(request).toMatchObject({
		operation: 'copy',
		sourceGuid: testProgram.guid,
		targetOrganizationGuid: testProgram.organization,
		targetOrganizationalUnitGuid: null,
		rootPayload: { title }
	});
	expect(request).not.toHaveProperty('relation');
	expect(request).not.toHaveProperty('creatorGuid');
	expect(request).not.toHaveProperty('realm');

	const copiedProgram = await copyResponse.json();
	expect(copiedProgram.payload.title).toBe(title);
	expect(copiedProgram.relation).toContainEqual(
		expect.objectContaining({
			object: testProgram.guid,
			predicate: 'is-copy-of',
			subject: copiedProgram.guid
		})
	);
	expect(copiedProgram.relation).toContainEqual(
		expect.objectContaining({
			object: copiedProgram.guid,
			predicate: 'is-part-of-program'
		})
	);
	expect(copiedProgram.relation).not.toContainEqual(
		expect.objectContaining({ subject: testMeasure.guid })
	);
	const partsResponse = await dotsBoard.page.request.get(
		`/container/${copiedProgram.guid}/relation?relationType=is-part-of-program`
	);
	expect(partsResponse.ok()).toBe(true);
	const copiedParts = await partsResponse.json();
	const copiedMeasure = copiedParts.find(
		(part: {
			guid: string;
			relation: Array<{ object: string; predicate: string; subject: string }>;
		}) =>
			part.relation.some(
				(relation) =>
					relation.object === testMeasure.guid &&
					relation.predicate === 'is-copy-of' &&
					relation.subject === part.guid
			)
	);
	expect(copiedMeasure).toBeDefined();
	expect(copiedMeasure.guid).not.toBe(testMeasure.guid);
	expect(copiedMeasure.relation).toContainEqual(
		expect.objectContaining({
			object: copiedProgram.guid,
			predicate: 'is-part-of-program',
			subject: copiedMeasure.guid
		})
	);
	await expect(dotsBoard.overlay.title).toHaveText(title);
});

test('falls back to an administered location when the current context is denied', async ({
	dotsBoard,
	defaultOrganization,
	testOrganization,
	testPublicProgram
}) => {
	expect(testOrganization.guid).not.toBe(defaultOrganization.guid);
	// Browser projects share the org-admin user, so another worker can remove the selected
	// fallback during teardown. This test covers client selection; persistence is tested above.
	await dotsBoard.page.route('**/container/copy', async (route) => {
		const request = route.request().postDataJSON();
		await route.fulfill({
			status: 201,
			contentType: 'application/json',
			body: JSON.stringify({
				...testPublicProgram,
				organization: request.targetOrganizationGuid,
				organizational_unit: request.targetOrganizationalUnitGuid
			})
		});
	});
	await dotsBoard.page.goto(
		`/${defaultOrganization.guid}/all/level#view=${testPublicProgram.guid}`
	);
	await expect(dotsBoard.overlay.title).toHaveText(testPublicProgram.payload.title);
	await dotsBoard.overlay.editModeToggle.check();
	await dotsBoard.overlay.locator.getByRole('button', { name: 'Copy', exact: true }).click();

	const copyResponsePromise = dotsBoard.page.waitForResponse(
		(response) =>
			response.url().endsWith('/container/copy') && response.request().method() === 'POST'
	);
	await dotsBoard.page.getByRole('dialog').getByRole('button', { name: 'Save' }).click();
	const copyResponse = await copyResponsePromise;

	expect(copyResponse.status()).toBe(201);
	const request = copyResponse.request().postDataJSON();
	expect(request).toMatchObject({
		operation: 'copy',
		sourceGuid: testPublicProgram.guid
	});
	expect({
		organizationGuid: request.targetOrganizationGuid,
		organizationalUnitGuid: request.targetOrganizationalUnitGuid
	}).not.toEqual({
		organizationGuid: defaultOrganization.guid,
		organizationalUnitGuid: null
	});
});

test.describe('as sysadmin', () => {
	test.use({ storageState: 'tests/.auth/admin.json' });

	test('shows the copy action without an organization-admin relation', async ({
		dotsBoard,
		testProgram
	}) => {
		await dotsBoard.page.goto(`/${testProgram.organization}/all/level#view=${testProgram.guid}`);
		await expect(dotsBoard.overlay.title).toHaveText(testProgram.payload.title);
		await dotsBoard.overlay.editModeToggle.check();

		await expect(
			dotsBoard.overlay.locator.getByRole('button', { name: 'Copy', exact: true })
		).toBeVisible();
	});
});

test('keeps missing sources opaque and rejects organization roots', async ({
	adminContext,
	testOrganization
}) => {
	const missingResponse = await adminContext.request.post('/container/copy', {
		data: {
			operation: 'copy',
			sourceGuid: '00000000-0000-4000-8000-000000000099',
			targetOrganizationGuid: testOrganization.guid,
			targetOrganizationalUnitGuid: null,
			rootPayload: { title: 'Unknown', type: 'text' }
		}
	});
	expect(missingResponse.status()).toBe(404);

	const organizationResponse = await adminContext.request.post('/container/copy', {
		data: {
			operation: 'copy',
			sourceGuid: testOrganization.guid,
			targetOrganizationGuid: testOrganization.guid,
			targetOrganizationalUnitGuid: null,
			rootPayload: testOrganization.payload
		}
	});
	expect(organizationResponse.status()).toBe(422);
});
