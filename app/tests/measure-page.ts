import { expect, type Page } from '@playwright/test';
import type { Container, MeasurePayload, SimpleMeasurePayload } from '$lib/models';
import Header from './header';

export default class MeasurePage {
	readonly header: Header;
	constructor(readonly page: Page) {
		this.header = new Header(page);
	}
	async goto(measure: Container<MeasurePayload | SimpleMeasurePayload>) {
		await this.page.goto(`/${measure.organization}/${measure.guid}`);
		await this.page.waitForLoadState('networkidle');
		await this.header.editModeToggle.check();
	}
	get goals() {
		return this.page
			.getByRole('main')
			.locator('section')
			.filter({ has: this.page.getByRole('heading', { name: 'Goals', exact: true }) });
	}
	get addGoalButton() {
		return this.goals.getByRole('button', { name: 'Add item', exact: true }).first();
	}
	async createGoal() {
		await this.addGoalButton.click();
		const dialog = this.page.getByRole('dialog');
		await expect(dialog).toBeVisible();
		return dialog;
	}
}
