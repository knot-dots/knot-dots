import type { Locator } from '@playwright/test';

export class StrategyForm {
	constructor(public readonly parentLocator: Locator) {}

	get categoryListbox(): Locator {
		return this.parentLocator.getByLabel('Category');
	}

	get saveButton(): Locator {
		return this.parentLocator.getByRole('button', { exact: true, name: 'Save' });
	}

	get strategyTypeSelect(): Locator {
		return this.parentLocator.getByLabel('Strategy type');
	}

	get titleInput(): Locator {
		return this.parentLocator.getByLabel('Strategy', { exact: true });
	}

	get topicListbox() {
		return this.parentLocator.getByLabel('Topic');
	}

	async save() {
		await this.saveButton.click();
	}
}
