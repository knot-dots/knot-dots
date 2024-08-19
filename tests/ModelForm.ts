import type { Locator } from '@playwright/test';

export class ModelForm {
	constructor(public readonly parentLocator: Locator) {}

	get categoryListbox(): Locator {
		return this.parentLocator.getByLabel('Category');
	}

	get descriptionEditor(): Locator {
		return this.parentLocator.getByLabel('Description');
	}

	get saveButton(): Locator {
		return this.parentLocator.getByRole('button', { exact: true, name: 'Save' });
	}

	get summaryTextarea(): Locator {
		return this.parentLocator.getByLabel('Summary');
	}

	get titleInput(): Locator {
		return this.parentLocator.getByLabel('Model', { exact: true });
	}

	get topicListbox() {
		return this.parentLocator.getByLabel('Topic');
	}

	async save() {
		await this.saveButton.click();
	}
}
