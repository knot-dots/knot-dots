import { expect, type Page } from '@playwright/test';
import type {
	Container,
	MeasurePayload,
	RelationCollectionPayload,
	SimpleMeasurePayload
} from '$lib/models';
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
	section(section: Container<RelationCollectionPayload>) {
		return this.page.getByRole('main').locator(`#section-${section.guid}`);
	}
	addItemButton(section: Container<RelationCollectionPayload>) {
		return this.section(section).getByRole('button', { name: 'Add item', exact: true }).first();
	}
	async createItem(section: Container<RelationCollectionPayload>) {
		await this.addItemButton(section).click();
		const dialog = this.page.getByRole('dialog');
		await expect(dialog).toBeVisible();
		return dialog;
	}
}
