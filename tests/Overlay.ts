import type { Page, Locator } from '@playwright/test';
import { OrganizationForm } from './OrganizationForm';

export class Overlay {
	public readonly locator: Locator;
	public readonly organizationForm;

	constructor(public readonly page: Page) {
		this.locator = page.getByTestId('overlay');
		this.organizationForm = new OrganizationForm(this.locator);
	}
}
