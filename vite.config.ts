import { sveltekit } from '@sveltejs/kit/vite';
import Icons from 'unplugin-icons/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [
		sveltekit(),
		Icons({
			compiler: 'svelte'
		})
	],
	ssr: {
		noExternal: ['svelte-hero-icons']
	},
	test: {
		include: ['src/**/*.{test,spec}.{js,ts}']
	}
});
