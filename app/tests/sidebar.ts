import type { Locator, Page } from '@playwright/test';

export default class Sidebar {
	readonly locator: Locator;

	constructor(readonly page: Page) {
		this.locator = page.getByRole('navigation');
	}

	async openProfileSettings() {
		await this.locator.getByRole('button', { name: 'User menu' }).click();
		await this.locator.getByRole('button', { name: 'Settings' }).click();
	}
}
