import { devices } from '@playwright/test';
import type { PlaywrightTestConfig } from '@playwright/test';

const config: PlaywrightTestConfig = {
	projects: [
		{
			name: 'authenticate users',
			testMatch: ['auth.setup.ts']
		},
		{
			name: 'firefox',
			use: { ...devices['Desktop Firefox'] },
			dependencies: ['authenticate users']
		},
		{
			name: 'chromium',
			use: { ...devices['Desktop Chrome'] },
			dependencies: ['authenticate users']
		},
		{
			name: 'ipad',
			use: { ...devices['iPad (gen 5)'] },
			dependencies: ['authenticate users']
		}
	],
	reporter: process.env.CI ? 'github' : 'list',
	retries: process.env.CI ? 1 : 0,
	testDir: 'tests',
	use: {
		baseURL: 'http://localhost:3000',
		locale: 'en-US',
		trace: 'on-first-retry'
	},
	webServer: {
		command: 'docker compose up --build preview',
		port: 3000,
		reuseExistingServer: !process.env.CI,
		timeout: 180 * 1000
	}
};

export default config;
