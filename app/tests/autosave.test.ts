import { expect, test } from './fixtures';

test.use({ suiteId: 'autosave' });
test.use({ storageState: 'tests/.auth/admin.json' });

test.describe('autoSave race conditions', () => {
	test('outbound race: second debounce fires before first request reaches the server', async ({
		dotsBoard,
		testMeasure
	}) => {
		// Scenario: the first request is still in-flight (has not reached the server yet) when a
		// second debounce fires. Two concurrent requests would be sent with the same revision;
		// whichever arrives second would get a 412.

		const dialogs: string[] = [];
		dotsBoard.page.on('dialog', async (dialog) => {
			dialogs.push(dialog.message());
			await dialog.dismiss();
		});

		let firstRequestResolver!: () => void;
		let firstRequest = true;

		// Hold the first POST request BEFORE it reaches the server. Non-POST requests (e.g. GET
		// revision history fetched during page load) are passed through immediately.
		await dotsBoard.page.route(`**/container/${testMeasure.guid}/revision`, async (route) => {
			if (route.request().method() !== 'POST') {
				await route.continue();
				return;
			}
			if (firstRequest) {
				firstRequest = false;
				await new Promise<void>((resolve) => {
					firstRequestResolver = resolve;
				});
			}
			await route.continue();
		});

		// Navigate directly by guid — avoids depending on the card title being unchanged
		await dotsBoard.page.goto(`/${testMeasure.organization}/all/level#view=${testMeasure.guid}`);
		await dotsBoard.overlay.editModeToggle.check();

		const titleField = dotsBoard.overlay.locator.getByRole('heading', { level: 1 });

		await titleField.fill('First concurrent edit');
		await dotsBoard.page.waitForTimeout(2200);

		await titleField.fill('Second concurrent edit');
		await dotsBoard.page.waitForTimeout(2200);

		let revisionResponseCount = 0;
		const secondResponsePromise = dotsBoard.page.waitForResponse((res) => {
			if (!res.url().includes(`/container/${testMeasure.guid}/revision`)) return false;
			revisionResponseCount++;
			return revisionResponseCount === 2;
		});

		// Must release BEFORE awaiting to avoid deadlock
		firstRequestResolver();

		const secondResponse = await secondResponsePromise;
		expect(secondResponse.ok()).toBe(true);
		expect(dialogs, 'Expected no stale revision alert').toHaveLength(0);

		await dotsBoard.page.goto(`/${testMeasure.organization}/all/level#view=${testMeasure.guid}`);
		await expect(dotsBoard.overlay.title).toHaveText('Second concurrent edit');
	});

	test('inbound race: second debounce fires while first response is still in transit', async ({
		dotsBoard,
		testMeasure
	}) => {
		// Scenario: the first request has already been processed by the server (DB write done,
		// revision incremented) but the response has not yet been delivered to the page. A second
		// debounce fires with the still-stale local revision, which would produce a 412.

		const dialogs: string[] = [];
		dotsBoard.page.on('dialog', async (dialog) => {
			dialogs.push(dialog.message());
			await dialog.dismiss();
		});

		let firstResponseResolver!: () => void;
		let firstRequest = true;

		// Let the first POST request reach the server immediately (route.fetch), but hold the
		// response before delivering it to the page. Non-POST requests (e.g. GET revision history
		// fetched during page load) are passed through immediately.
		await dotsBoard.page.route(`**/container/${testMeasure.guid}/revision`, async (route) => {
			if (route.request().method() !== 'POST') {
				await route.continue();
				return;
			}
			if (firstRequest) {
				firstRequest = false;
				const response = await route.fetch(); // server writes to DB here
				await new Promise<void>((resolve) => {
					firstResponseResolver = resolve;
				});
				await route.fulfill({ response }); // now deliver the response to the page
			} else {
				await route.continue();
			}
		});

		// Navigate directly by guid — avoids depending on the card title being unchanged
		await dotsBoard.page.goto(`/${testMeasure.organization}/all/level#view=${testMeasure.guid}`);
		await dotsBoard.overlay.editModeToggle.check();

		const titleField = dotsBoard.overlay.locator.getByRole('heading', { level: 1 });

		await titleField.fill('First concurrent edit');
		await dotsBoard.page.waitForTimeout(2200);

		await titleField.fill('Second concurrent edit');
		await dotsBoard.page.waitForTimeout(2200);

		let revisionResponseCount = 0;
		const secondResponsePromise = dotsBoard.page.waitForResponse((res) => {
			if (!res.url().includes(`/container/${testMeasure.guid}/revision`)) return false;
			revisionResponseCount++;
			return revisionResponseCount === 2;
		});

		// Must release BEFORE awaiting to avoid deadlock
		firstResponseResolver();

		const secondResponse = await secondResponsePromise;
		expect(secondResponse.ok()).toBe(true);
		expect(dialogs, 'Expected no stale revision alert').toHaveLength(0);

		await dotsBoard.page.goto(`/${testMeasure.organization}/all/level#view=${testMeasure.guid}`);
		await expect(dotsBoard.overlay.title).toHaveText('Second concurrent edit');
	});
});
