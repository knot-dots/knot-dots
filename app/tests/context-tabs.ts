import type { Locator } from '@playwright/test';

export default class ContextTabs {
	readonly locator: Locator;

	constructor(readonly base: Locator) {
		this.locator = base.getByRole('complementary');
	}

	get current() {
		return this.locator.getByRole('tabpanel');
	}

	async open(name: string, isMobile: boolean = false): Promise<void> {
		if (isMobile) {
			await this.locator.getByRole('tab', { name: 'Help' }).click();
		}
		await this.locator.getByRole('tab', { name }).click();
	}

	async close() {
		await this.current.getByRole('button', { name: 'Close' }).click();
	}
}
