import Header from './header';
import Overlay from './overlay';
import Sidebar from './sidebar';
import type { Locator, Page } from '@playwright/test';

class BasePage {
	readonly header: Header;
	readonly overlay: Overlay;
	readonly sidebar: Sidebar;

	constructor(readonly page: Page) {
		this.header = new Header(page);
		this.overlay = new Overlay(page);
		this.sidebar = new Sidebar(page);
	}

	get sections() {
		return this.page.locator('.sections section');
	}

	get title() {
		return this.page.getByRole('heading', { level: 1 });
	}

	async addSection(type: string) {
		const numberOfSections = await this.sections.count();

		if (numberOfSections === 0) {
			await this.page.getByRole('button', { name: 'Add section' }).click();
			await this.page.getByRole('menuitem', { name: type }).click();
		} else {
			const lastSection = this.sections.nth(numberOfSections - 1);
			await lastSection.hover();
			await lastSection.getByRole('button', { name: 'Add section' }).click();
			await lastSection.getByRole('menuitem', { name: type }).click();
		}

		return this.sections.nth(numberOfSections);
	}

	async deleteSection(section: Locator) {
		await section.hover();
		await section.getByRole('button', { name: 'Settings' }).click();
		await section.getByRole('button', { name: 'Delete' }).click();
		await this.page.getByRole('button', { name: /I want to delete/i }).click();
	}
}

export class LandingPage extends BasePage {
	async goto(baseUrl: string) {
		await this.page.goto(`${baseUrl}/all/page`);
	}
}
