import Header from './header';
import Overlay from './overlay';
import Sidebar from './sidebar';
import type { Page } from '@playwright/test';

export class Table {
	readonly header: Header;
	readonly overlay: Overlay;
	readonly sidebar: Sidebar;

	constructor(readonly page: Page) {
		this.header = new Header(page);
		this.overlay = new Overlay(page);
		this.sidebar = new Sidebar(page);
	}
}

export class AllTable extends Table {
	async goto(baseURL: string) {
		await this.page.goto(`${baseURL}/all/table`);
		await this.page.waitForLoadState('networkidle');
	}
}
