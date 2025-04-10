import { sveltekit } from '@sveltejs/kit/vite';
import { FileSystemIconLoader } from 'unplugin-icons/loaders';
import Icons from 'unplugin-icons/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [
		sveltekit(),
		Icons({
			compiler: 'svelte',
			customCollections: {
				knotdots: FileSystemIconLoader('./src/lib/assets/icons')
			},
			iconCustomizer(collection, icon, props) {
				if (collection === 'heroicons') {
					props.width = '20px';
					props.height = '20px';
				} else if (collection === 'flowbite') {
					props.width = '20px';
					props.height = '20px';
				} else if (collection === 'knotdots') {
					props.width = '20px';
					props.height = '20px';
				}
			}
		})
	],
	test: {
		include: ['src/**/*.{test,spec}.{js,ts}']
	}
});
