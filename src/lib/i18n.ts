import { browser } from '$app/environment';
import { init } from 'svelte-i18n';

const defaultLocale = 'de';

init({
	fallbackLocale: defaultLocale,
	initialLocale: browser ? window.navigator.language : defaultLocale
});
