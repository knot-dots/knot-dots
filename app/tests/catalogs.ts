import Header from './header';
import Overlay from './overlay';
import Sidebar from './sidebar';
import type { Page } from '@playwright/test';

export class Catalog {
	readonly header: Header;
	readonly overlay: Overlay;
	readonly sidebar: Sidebar;

	constructor(readonly page: Page) {
		this.header = new Header(page);
		this.overlay = new Overlay(page);
		this.sidebar = new Sidebar(page);
	}

	card(title: string) {
		return this.page.getByTitle(title);
	}
}

export class AllCatalog extends Catalog {
	async openAddItemMenu() {
		const button = this.page.getByRole('button', { name: 'Object', exact: true });
		await button.click();
		const menuId = await button.getAttribute('aria-controls');
		return this.page.locator(`[id="${menuId}"]`);
	}

	async goto(baseURL: string) {
		await this.page.goto(`${baseURL}/all/catalog`);
	}
}

export class IndicatorCatalog extends Catalog {
	get addCustomIndicatorButton() {
		return this.page.getByRole('button', { name: 'Create a custom indicator' });
	}

	get activateSelectedIndicatorsButton() {
		return this.page.getByRole('button', { name: 'Activate selected indicators' });
	}

	async goto(baseURL: string) {
		await this.page.goto(`${baseURL}/indicators/catalog`);
	}
}

export class ResourceCatalog extends Catalog {
	async goto(baseURL: string) {
		await this.page.goto(`${baseURL}/resources/catalog`);
	}
}
