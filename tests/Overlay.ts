import type { Page, Locator } from '@playwright/test';
import { ModelForm } from './ModelForm';
import { OrganizationForm } from './OrganizationForm';
import { StrategyForm } from './StrategyForm';
import { StrategyView } from './StrategyView';
import { UndefinedForm } from './UndefinedForm';

export class Overlay {
	public readonly locator: Locator;
	public readonly modelForm: ModelForm;
	public readonly organizationForm;
	public readonly strategyForm: StrategyForm;
	public readonly strategyView: StrategyView;
	public readonly undefinedForm: UndefinedForm;

	constructor(public readonly page: Page) {
		this.locator = page.getByTestId('overlay');
		this.modelForm = new ModelForm(this.locator);
		this.organizationForm = new OrganizationForm(this.locator);
		this.strategyForm = new StrategyForm(this.locator);
		this.strategyView = new StrategyView(this.locator);
		this.undefinedForm = new UndefinedForm(this.locator);
	}
}
