import { devices } from '@playwright/test';
import type { PlaywrightTestConfig } from '@playwright/test';

const config: PlaywrightTestConfig = {
	projects: [
		{
			name: 'chromium',
			use: { ...devices['Desktop Chrome'] }
		},
		{
			name: 'iphone8',
			use: { ...devices['iPhone 8'] }
		}
	],
	use: {
		trace: 'on-first-retry'
	},
	webServer: {
		command: 'docker compose up --build preview',
		port: 3000,
		reuseExistingServer: !process.env.CI,
		timeout: 180 * 1000
	},
	reporter: process.env.CI ? 'github' : 'list',
	retries: process.env.CI ? 1 : 0,
	testDir: 'tests'
};

export default config;
