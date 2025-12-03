import { devices } from '@playwright/test';
import type { PlaywrightTestConfig } from '@playwright/test';

const config: PlaywrightTestConfig = {
	projects: [
		// Authenticate
		{
			name: 'authenticate users',
			testMatch: ['auth.setup.ts']
		},

		// Global setup
		{
			name: 'setup objects',
			testMatch: [/global\.setup\.ts/],
			dependencies: ['authenticate users'],
			use: {
				storageState: 'tests/.auth/admin.json'
			}
		},

		// Main Tests
		{
			name: 'firefox',
			use: { ...devices['Desktop Firefox'] },
			dependencies: ['setup objects']
		},
		{
			name: 'chromium',
			use: { ...devices['Desktop Chrome'] },
			dependencies: ['setup objects']
		},
		{
			name: 'ipad',
			use: { ...devices['iPad (gen 5)'] },
			dependencies: ['setup objects']
		}
	],
	use: {
		trace: 'on-first-retry',

		// Sets the browser locale to English (en-US)
		locale: 'en-US'
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
