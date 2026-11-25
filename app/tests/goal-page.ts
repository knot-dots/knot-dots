import { expect, type Page } from '@playwright/test';
import type { Container, GoalPayload } from '$lib/models';
import Header from './header';

export default class GoalPage {
	readonly header: Header;
	constructor(readonly page: Page) {
		this.header = new Header(page);
	}
	async goto(goal: Container<GoalPayload>) {
		await this.page.goto(`/${goal.organization}/${goal.guid}`);
		await this.header.editModeToggle.check();
	}
	get objectives() {
		return this.page
			.getByRole('main')
			.locator('section')
			.filter({ has: this.page.getByRole('heading', { name: 'Objectives', exact: true }) });
	}
	get addObjectiveButton() {
		return this.objectives.getByRole('button', { name: 'Add item', exact: true }).first();
	}
	async createObjective() {
		await this.addObjectiveButton.click();
		const dialog = this.page.getByRole('dialog');
		await expect(dialog).toBeVisible();
		return dialog;
	}
}
