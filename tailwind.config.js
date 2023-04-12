import flowbitePlugin from 'flowbite/plugin';

/** @type {import('tailwindcss').Config} */
const config = {
	content: [
		'./src/**/*.{html,js,svelte,ts}',
		'./node_modules/flowbite-svelte/**/*.{html,js,svelte,ts}'
	],
	theme: {
		extend: {
			// see default breakpoints at https://tailwindcss.com/docs/screens
			screens: {
				sm: '360px',
				md: '768px',
				lg: '1440px',
				xl: '1920px'
			}
		}
	},
	plugins: [flowbitePlugin],
	darkMode: 'class'
};

export default config;
