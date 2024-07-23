import type { Page, Locator } from '@playwright/test';

export class DotsPage {
	readonly addProgramLink: Locator;
	readonly programs: Locator;

	constructor(public readonly page: Page) {
		this.addProgramLink = this.page
			.locator('header')
			.filter({ hasText: 'Programs' })
			.getByRole('link', { name: 'Add item' });
		this.programs = this.page
			.getByRole('main')
			.locator('section')
			.filter({ has: page.getByRole('heading', { name: 'Programs' }) })
			.getByRole('article');
	}

	async goto() {
		await this.page.goto('/');
	}

	async addProgram() {
		await this.addProgramLink.click();
	}
}
