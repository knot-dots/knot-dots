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
	webServer: {
		command: 'npm run build && npm run preview',
		port: 4173
	},
	testDir: 'tests'
};

export default config;
