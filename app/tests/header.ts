import type { Page } from '@playwright/test';

export default class Header {
	readonly locator;

	constructor(readonly page: Page) {
		this.locator = page.getByRole('banner');
	}

	get filterButton() {
		return this.locator.getByRole('button', { name: 'Filter' });
	}

	async enableEditMode() {
		await this.locator.getByRole('checkbox', { name: 'Edit mode' }).check();
	}
}
