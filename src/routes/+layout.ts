import { locale, waitLocale } from 'svelte-i18n';
import { browser } from '$app/environment';
import '$lib/i18n'; // Import to initialize. Important :)
import type { LayoutLoad } from './$types';

export const load: LayoutLoad = async ({ url, data }) => {
	if (browser) {
		locale.set(window.navigator.language);
	}
	await waitLocale();

	return { ...data, pathname: url.pathname };
};
