import type { Locator, Page } from '@playwright/test';

export default class Sidebar {
	readonly locator: Locator;

	constructor(readonly page: Page) {
		this.locator = page.getByRole('navigation');
	}

	get burgerMenu() {
		return this.page.getByRole('button', { name: 'Menu' });
	}

	get organizationPanel() {
		return this.page.locator('.sidebar-panel', {
			has: this.page.getByRole('button', { name: 'Organizations' })
		});
	}

	get organizationalUnitPanel() {
		return this.page.locator('.sidebar-panel', {
			has: this.page.getByRole('button', { name: 'Organizational units' })
		});
	}

	async openAdministrationMenu(panel: Locator) {
		await panel.getByRole('button', { name: 'Administration' }).click();
	}

	async openProfileSettings() {
		await this.locator.getByRole('button', { name: 'User menu' }).click();
		await this.locator.getByRole('button', { name: 'Settings' }).click();
	}
}
