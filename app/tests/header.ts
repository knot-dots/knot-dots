import { expect, type Page } from '@playwright/test';

export default class Header {
	readonly locator;

	constructor(readonly page: Page) {
		this.locator = page.getByRole('banner');
	}

	get editModeToggle() {
		return this.locator.getByRole('checkbox', { name: 'Edit mode' });
	}

	get bulkActionControls() {
		return this.locator.locator('+ .commands').getByRole('group', { name: 'Bulk actions' });
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
