import type { Locator } from '@playwright/test';

export default class Column {
	constructor(readonly locator: Locator) {}

	card(title: string) {
		return this.locator.getByTitle(title);
	}
}
