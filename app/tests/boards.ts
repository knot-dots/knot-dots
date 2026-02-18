import { type Page, expect } from '@playwright/test';
import Column from './column';
import Header from './header';
import Overlay from './overlay';
import Sidebar from './sidebar';

export class Board {
	readonly header: Header;
	readonly overlay: Overlay;
	readonly sidebar: Sidebar;

	constructor(readonly page: Page) {
		this.header = new Header(page);
		this.overlay = new Overlay(page);
		this.sidebar = new Sidebar(page);
	}

	get columns() {
		return this.page.getByRole('main').locator('section');
	}

	card(title: string) {
		return this.columns.getByTitle(title);
	}

	column(heading: string) {
		return new Column(
			this.columns.filter({ has: this.page.getByRole('heading', { name: heading }) })
		);
	}
}

export class CategoriesBoard extends Board {
	async goto(baseURL: string) {
		await this.page.goto(`${baseURL}/categories`);
	}
}

export class DotsBoard extends Board {
	async goto(baseURL: string) {
		await this.page.goto(`${baseURL}/all/level`);
	}
}

export class TaskStatusBoard extends Board {
	async goto(baseURL: string) {
		await this.page.goto(`${baseURL}/tasks/status`);
	}

	async moveCardToColumn(cardTitle: string, columnHeading: string) {
		const card = this.card(cardTitle);
		const targetColumn = this.column(columnHeading);
		const sourceBox = await card.boundingBox();
		const targetBox = await targetColumn.locator.boundingBox();

		if (!sourceBox || !targetBox) {
			throw new Error('Could not determine bounding boxes for drag-and-drop');
		}

		// Start drag in the middle of the card
		const startX = sourceBox.x + sourceBox.width / 2;
		const startY = sourceBox.y + Math.min(24, sourceBox.height / 2);

		// Drop in the middle of the target column
		const endX = targetBox.x + targetBox.width / 2;
		const endY = targetBox.y + targetBox.height / 2;

		// Grab card
		await this.page.mouse.move(startX, startY);
		await this.page.mouse.down();

		// Move in two steps to simulate dragging
		await this.page.mouse.move((startX + endX) / 2, (startY + endY) / 2);
		await this.page.mouse.move(endX, endY);

		// Wait for the drop zone to contain the (invisible) card before releasing the mouse button
		await expect(targetColumn.card(cardTitle).first()).toBeAttached({ timeout: 5000 });
		await this.page.mouse.up();
	}
}
