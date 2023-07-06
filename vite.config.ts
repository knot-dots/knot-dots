import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	optimizeDeps: {
		exclude: ["bytemd"]
	},
	plugins: [sveltekit()],
	ssr: {
		noExternal: ["svelte-hero-icons"],
	},
	test: {
		include: ['src/**/*.{test,spec}.{js,ts}']
	}
});
