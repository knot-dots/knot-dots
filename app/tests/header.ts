import { expect, type Page } from '@playwright/test';

export default class Header {
	readonly locator;

	constructor(readonly page: Page) {
		this.locator = page.getByRole('banner');
	}

	get bulkActionControls() {
		return this.locator.locator('+ .commands').getByRole('group', { name: 'Bulk actions' });
	}

	get disclosePropertiesButton() {
		return this.locator.getByRole('button', { name: 'Show all properties' });
	}

	get editModeToggle() {
		return this.locator.getByRole('checkbox', { name: 'Edit mode' });
	}

	get settingsMenu() {
		return this.locator.getByRole('group').filter({ hasText: 'Settings' });
	}

	get userFavoriteToggle() {
		return this.locator.getByRole('button', { name: /Add to sidebar|Remove from sidebar/ });
	}

	/**
	 * Toggles the current page in the favorites of the organization or organizational unit and
	 * waits until they are saved.
	 */
	async toggleFavorite(name: 'Add to sidebar' | 'Remove from sidebar') {
		await this.openSettingsMenu();
		const saved = this.page.waitForResponse(
			(r) => r.url().includes('/revision') && r.request().method() === 'POST'
		);
		await this.settingsMenu.getByRole('button', { name }).click();
		expect((await saved).ok()).toBe(true);
	}

	async openSettingsMenu() {
		const button = this.locator.getByRole('button', { name: 'Settings' });
		// The header of the previous page may linger briefly after navigating.
		await expect(button).toHaveCount(1);
		await button.click();
		await expect(this.settingsMenu).toBeVisible();
	}

	async openWorkspaceMenu(currentWorkspace: string) {
		const trigger = this.locator.getByRole('button', { name: currentWorkspace, exact: true });
		await expect(trigger).toBeVisible();
		await expect(trigger).toHaveAttribute('aria-haspopup', 'true');
		await trigger.click();

		const menu = this.page.getByRole('menu');
		await expect(menu).toBeVisible();
		return menu;
	}

	async selectWorkspace(currentWorkspace: string, targetWorkspace: string | RegExp) {
		const menu = await this.openWorkspaceMenu(currentWorkspace);
		const item = menu.getByRole('menuitem', { name: targetWorkspace });
		await expect(item).toBeVisible();
		await item.click();
	}
}
