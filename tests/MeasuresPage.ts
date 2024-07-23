import type { Page, Locator } from '@playwright/test';

export class MeasuresPage {
	readonly addIdeaLink: Locator;
	readonly addInPlanningLink: Locator;
	readonly ideas: Locator;

	constructor(public readonly page: Page) {
		this.addIdeaLink = this.page
			.locator('header')
			.filter({ hasText: 'Idea' })
			.getByRole('link', { name: 'Add item' });
		this.addInPlanningLink = this.page
			.getByRole('main')
			.getByRole('generic')
			.filter({ has: this.page.getByRole('heading', { name: 'In planning' }) })
			.getByRole('link', { name: 'Add item' });
		this.ideas = this.page
			.getByRole('main')
			.locator('section')
			.filter({ has: page.getByRole('heading', { name: 'Idea' }) })
			.getByRole('article');
	}

	async goto() {
		await this.page.goto('/implementation');
	}

	async addIdea() {
		await this.addIdeaLink.click();
	}

	async addInPlanning() {
		await this.addInPlanningLink.click();
	}
}
