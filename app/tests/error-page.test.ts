import { expect, test } from './fixtures';
import { ErrorPage, ProgramPage } from './pages';

test.use({ suiteId: 'error-page' });

// The platform's home page without a path, e.g. http://localhost:3000
const platformHomeURL = /^https?:\/\/[^/]+\/?$/;

test.describe('Error page for anonymous users', () => {
	test('a page that is not public offers to log in', async ({
		defaultOrganization,
		page,
		testPrivateProgram
	}) => {
		const errorPage = new ErrorPage(page);

		await new ProgramPage(page).goto(testPrivateProgram);

		await expect(errorPage.title).toHaveText('This page is not public');
		await expect(errorPage.title).toBeFocused();
		await expect(errorPage.code).toHaveText('Error code 404');
		await expect(errorPage.header.locator).toBeVisible();
		await expect(page).toHaveTitle(`Page not available – ${defaultOrganization.payload.name}`);
		await expect(errorPage.main.getByRole('button', { name: 'Log in' })).toBeVisible();
		await expect(errorPage.main.getByRole('link', { name: 'Go to home page' })).toHaveAttribute(
			'href',
			new RegExp(`/${testPrivateProgram.organization}$`)
		);
	});

	test('an organization that is not public offers to log in or go to knotdots.net', async ({
		page,
		testOrganization
	}) => {
		const errorPage = new ErrorPage(page);

		await page.goto(`/${testOrganization.guid}`);

		await expect(errorPage.title).toHaveText('This page is not public');
		await expect(errorPage.title).toBeFocused();
		await expect(page).toHaveTitle('Page not available – knotdots.net');
		await expect(errorPage.main.getByRole('button', { name: 'Log in' })).toBeVisible();
		await expect(errorPage.main.getByRole('link', { name: 'Go to knotdots.net' })).toHaveAttribute(
			'href',
			platformHomeURL
		);
	});

	test('logging in from the error page returns to the requested page', async ({
		page,
		testPrivateProgram
	}) => {
		const errorPage = new ErrorPage(page);

		await new ProgramPage(page).goto(testPrivateProgram);
		const requestedURL = page.url();

		await errorPage.main.getByRole('button', { name: 'Log in' }).click();
		await page.getByRole('textbox', { name: 'Email' }).fill('admin@knotdots.net');
		await page.getByRole('textbox', { name: 'Password' }).fill('test');
		await page.getByRole('button', { name: 'Sign In' }).click();

		await expect(page).toHaveURL(requestedURL);
		await expect(
			page.getByRole('heading', { level: 1, name: testPrivateProgram.payload.title })
		).toBeVisible();
	});
});

test.describe('Error page for authenticated users', () => {
	test.use({ storageState: 'tests/.auth/orgadmin.json' });

	test('a page that is not available offers to go to the home page', async ({
		defaultOrganization,
		page
	}) => {
		const errorPage = new ErrorPage(page);

		await page.goto(`/${defaultOrganization.guid}/${crypto.randomUUID()}`);

		await expect(errorPage.title).toHaveText('This page is not available');
		await expect(errorPage.code).toHaveText('Error code 404');
		await expect(errorPage.header.locator).toBeVisible();
		await expect(errorPage.main.getByRole('link', { name: 'Go to home page' })).toHaveAttribute(
			'href',
			new RegExp(`/${defaultOrganization.guid}$`)
		);
		await expect(errorPage.main.getByRole('button', { name: 'Log in' })).toBeHidden();
		await expect(errorPage.main.getByRole('button', { name: 'Back' })).toBeHidden();
	});

	test('an unknown route offers to go to knotdots.net', async ({ page }) => {
		const errorPage = new ErrorPage(page);

		await page.goto('/__this_route_should_not_exist__');

		await expect(errorPage.title).toHaveText('This page is not available');
		await expect(errorPage.main.getByRole('link', { name: 'Go to knotdots.net' })).toHaveAttribute(
			'href',
			platformHomeURL
		);
	});

	test('going back is offered after navigating to the error page', async ({
		defaultOrganization,
		page
	}) => {
		const errorPage = new ErrorPage(page);
		const missingContentURL = `/${defaultOrganization.guid}/${crypto.randomUUID()}`;

		await page.goto(missingContentURL);
		await errorPage.main.getByRole('link', { name: 'Go to home page' }).click();
		await expect(page).not.toHaveURL(missingContentURL);
		await page.goBack();

		await expect(errorPage.title).toHaveText('This page is not available');
		await errorPage.main.getByRole('button', { name: 'Back' }).click();
		await expect(page).not.toHaveURL(missingContentURL);
	});
});
