import type { Locator } from '@playwright/test';

export class UndefinedForm {
	constructor(public readonly parentLocator: Locator) {}

	get payloadTypeSelect(): Locator {
		return this.parentLocator.getByLabel('Type of element');
	}

	get saveButton(): Locator {
		return this.parentLocator.getByRole('button', { exact: true, name: 'Save' });
	}

	get titleInput(): Locator {
		return this.parentLocator.getByLabel('undefined', { exact: true });
	}

	async save() {
		await this.saveButton.click();
	}
}
