import type { Locator, Page } from '@playwright/test';

export default class Overlay {
	readonly locator: Locator;

	constructor(readonly page: Page) {
		this.locator = page.locator('.overlay');
	}

	get backButton() {
		return this.locator.getByRole('button', { name: 'Back' });
	}

	get closeButton() {
		return this.locator.getByRole('link', { name: 'Close' });
	}

	get deleteButton() {
		return this.locator.getByRole('button', { name: 'Delete' });
	}

	get disclosePropertiesButton() {
		return this.locator.getByRole('button', { name: 'Show all properties' });
	}

	get editModeToggle() {
		return this.locator.getByRole('checkbox', { name: 'Edit mode' });
	}

	get sections() {
		return this.locator.locator('.sections section');
	}

	get title() {
		return this.locator.getByRole('heading', { level: 1 });
	}

	async addSection(type: string) {
		const numberOfSections = await this.sections.count();

		if (numberOfSections === 0) {
			await this.locator.getByRole('button', { name: 'Add section' }).click();
			await this.locator.getByRole('menuitem', { name: type }).click();
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

	async delete() {
		await this.deleteButton.click();
		await this.page.getByRole('button', { name: `I want to delete` }).click();
	}
}
