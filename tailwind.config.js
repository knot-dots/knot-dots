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
				xs: '360px',
				s: '768px',
				m: '1440px',
				l: '1920px'
			}
		}
	},
	plugins: [flowbitePlugin],
	darkMode: 'class'
};

export default config;
