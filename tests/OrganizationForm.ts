import type { Locator } from '@playwright/test';

export class OrganizationForm {
	constructor(public readonly parentLocator: Locator) {}

	get boardsListbox(): Locator {
		return this.parentLocator.getByLabel('Boards');
	}

	get categorySelect(): Locator {
		return this.parentLocator.getByLabel('Category');
	}

	get nameInput(): Locator {
		return this.parentLocator.getByLabel('Organization', { exact: true });
	}

	get saveButton(): Locator {
		return this.parentLocator.getByRole('button', { exact: true, name: 'Save' });
	}

	async save() {
		await this.saveButton.click();
	}
}
