import { test as baseTest } from '@playwright/test';
import { Overlay } from './Overlay';

type Fixture = {
	overlay: Overlay;
};

export const test = baseTest.extend<Fixture>({
	overlay: async ({ page }, use) => {
		const overlay = new Overlay(page);
		await use(overlay);
	}
});

export { expect } from '@playwright/test';
