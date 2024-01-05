import { devices } from '@playwright/test';
import type { PlaywrightTestConfig } from '@playwright/test';
import dotenv from 'dotenv';

dotenv.config();

const config: PlaywrightTestConfig = {
	projects: [
		{
			name: 'setup',
			testMatch: /global.setup\.ts/
		},
		{
			name: 'chromium',
			use: { ...devices['Desktop Chrome'], storageState: 'tests/.auth/user.json' },
			dependencies: ['setup']
		},
		{
			name: 'iphone8',
			use: { ...devices['iPhone 8'], storageState: 'tests/.auth/user.json' },
			dependencies: ['setup']
		}
	],
	use: {
		proxy: {
			server: 'http://localhost:3128'
		},
		trace: 'on-first-retry'
	},
	webServer: {
		command: 'docker compose up --build preview-proxy',
		port: 3000,
		reuseExistingServer: !process.env.CI,
		timeout: 180 * 1000
	},
	reporter: process.env.CI ? 'github' : 'list',
	retries: process.env.CI ? 1 : 0,
	testDir: 'tests'
};

export default config;
