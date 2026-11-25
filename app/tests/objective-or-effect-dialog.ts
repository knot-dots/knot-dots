import { expect, type Locator, type Page } from '@playwright/test';
import type { AnyPayload, Container } from '$lib/models';

// Other indicators may fill the first page of suggestions.
export async function findSuggestion(dialog: Locator, title: string) {
	await dialog.getByRole('searchbox', { name: 'Search' }).fill(title);
	return dialog.getByRole('article').filter({ hasText: title });
}

export async function chooseKind(dialog: Locator, kind: string) {
	await dialog
		.getByRole('radiogroup', { name: 'Data type' })
		.getByText(kind, { exact: true })
		.click();
}

// Confirms the dialog. A new indicator is created before the objective or
// effect it is for. Whatever was created is added to created, so that it can be
// deleted after the test, even if an assertion fails.
export async function confirm(
	page: Page,
	dialog: Locator,
	{ newIndicator }: { newIndicator: boolean },
	created: Container<AnyPayload>[]
) {
	const responsePromise = page.waitForResponse(
		(response) =>
			new URL(response.url()).pathname === '/container/bulk-action/create' &&
			response.request().method() === 'POST'
	);
	await dialog.getByRole('button', { name: 'Confirm', exact: true }).click();
	const response = await responsePromise;

	const containers: Container<AnyPayload>[] = response.ok() ? await response.json() : [];
	created.push(...containers);
	expect(response.status()).toBe(201);
	expect(containers).toHaveLength(newIndicator ? 2 : 1);
	await expect(dialog).toBeHidden();

	return { indicator: newIndicator ? containers[0] : undefined, item: containers.at(-1)! };
}
