import { test as baseTest } from '@playwright/test';
import { MeasuresPage } from './MeasuresPage';
import { DotsPage } from './DotsPage';
import { Overlay } from './Overlay';

type Fixture = {
	dotsPage: DotsPage;
	measuresPage: MeasuresPage;
	overlay: Overlay;
};

export const test = baseTest.extend<Fixture>({
	dotsPage: async ({ page }, use) => {
		await page.goto('/');
		await page.getByRole('button', { name: 'Open organization menu' }).click();
		await page.getByRole('link', { name: 'Musterhausen' }).click();
		await use(new DotsPage(page));
	},
	measuresPage: async ({ page }, use) => {
		const measuresPage = new MeasuresPage(page);
		await measuresPage.goto();
		await use(measuresPage);
	},
	overlay: async ({ page }, use) => {
		const overlay = new Overlay(page);
		await use(overlay);
	}
});

export { expect } from '@playwright/test';
