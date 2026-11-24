import { expect, type Locator, type Page } from '@playwright/test';

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

	get userPanel() {
		return this.page.locator('.sidebar-panel', {
			has: this.page.getByRole('button', { name: 'User menu' })
		});
	}

	/**
	 * The links to the favorites in the given panel, in the order displayed.
	 */
	favorites(panel: Locator) {
		return panel.locator('.sidebar-menu .sidebar-menu').getByRole('link');
	}

	/**
	 * Drags the favorite above the target favorite in edit mode and waits until the new order
	 * is saved.
	 */
	async moveFavorite(source: Locator, target: Locator) {
		const sourceItem = source.locator('xpath=..');
		const handle = sourceItem.locator('.drag-handle');
		// The handle appears with a delay when hovering the favorite.
		await sourceItem.hover();
		await expect(handle).toBeVisible();
		const handleBox = await handle.boundingBox();
		const targetBox = await target.boundingBox();

		if (!handleBox || !targetBox) {
			throw new Error('Could not determine bounding boxes for favorite drag-and-drop');
		}

		const startX = handleBox.x + handleBox.width / 2;
		const startY = handleBox.y + handleBox.height / 2;
		const endY = targetBox.y + targetBox.height / 4;

		const saved = this.page.waitForResponse(
			(r) => r.url().includes('/revision') && r.request().method() === 'POST'
		);
		await this.page.mouse.move(startX, startY);
		await this.page.mouse.down();
		// Move in multiple steps to trigger svelte-dnd-action
		const steps = 10;
		for (let i = 1; i <= steps; i++) {
			await this.page.mouse.move(startX, startY + ((endY - startY) * i) / steps);
		}
		// The target moves down to make room once svelte-dnd-action has registered the move.
		await expect
			.poll(async () => (await target.boundingBox())?.y ?? targetBox.y)
			.toBeGreaterThan(targetBox.y);
		await this.page.mouse.up();
		expect((await saved).ok()).toBe(true);
		await expect(source).toBeVisible();
	}

	async openAdministrationMenu(panel: Locator) {
		await panel.getByRole('button', { name: 'Administration' }).click();
	}

	async openProfileSettings() {
		await this.locator.getByRole('button', { name: 'User menu' }).click();
		await this.locator.getByRole('button', { name: 'Settings' }).click();
	}
}
