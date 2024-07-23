import type { Locator } from '@playwright/test';

export class StrategyView {
	constructor(public readonly parentLocator: Locator) {}

	get addChapterLink(): Locator {
		return this.parentLocator.getByRole('link', { name: 'Chapter' });
	}

	get chapters(): Locator {
		return this.parentLocator.locator('.chapter');
	}

	get title(): Locator {
		return this.parentLocator.getByRole('heading', { level: 2 });
	}

	async addChapter() {
		await this.addChapterLink.click();
	}
}
