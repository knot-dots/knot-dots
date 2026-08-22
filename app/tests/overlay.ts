import type { Locator, Page } from '@playwright/test';
import ContextTabs from './context-tabs';

export default class Overlay {
	readonly locator: Locator;
	readonly contextTabs: ContextTabs;

	constructor(readonly page: Page) {
		this.locator = page.locator('.overlay');
		this.contextTabs = new ContextTabs(this.locator);
	}

	get backButton() {
		return this.locator.getByRole('button', { name: 'Back' });
	}

	get bulkActionControls() {
		return this.locator.getByRole('group', { name: 'Bulk actions' });
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

	get fullScreenButton() {
		return this.locator.getByRole('link', { name: 'Full screen' });
	}

	get sections() {
		return this.locator.locator('ul section');
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

	async moveSection(source: Locator, target: Locator) {
		await source.hover();
		const handle = source.locator('.drag-handle').first();
		const sourceBox = await handle.boundingBox();
		const targetBox = await target.boundingBox();

		if (!sourceBox || !targetBox) {
			throw new Error('Could not determine bounding boxes for section drag-and-drop');
		}

		const startX = sourceBox.x;
		const startY = sourceBox.y + sourceBox.height / 2;
		const endX = targetBox.x;
		const endY = targetBox.y + targetBox.height / 4;

		await this.page.mouse.move(startX, startY);
		await this.page.mouse.down();
		// Move in multiple steps to trigger svelte-dnd-action
		const steps = 10;
		for (let i = 1; i <= steps; i++) {
			await this.page.mouse.move(
				startX + ((endX - startX) * i) / steps,
				startY + ((endY - startY) * i) / steps
			);
		}
		await this.page.mouse.up();
	}

	async delete() {
		await this.deleteButton.click();
		await this.page.getByRole('button', { name: `I want to delete` }).click();
	}
}
