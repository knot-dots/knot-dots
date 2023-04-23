import type { Handle } from '@sveltejs/kit';
import { locale } from 'svelte-i18n';
import { getPool } from '$lib/server/db';

export const handle = (async ({ event, resolve }) => {
	const lang = event.request.headers.get('accept-language')?.split(',')[0];
	if (lang) {
		locale.set(lang);
	}
	event.locals.pool = await getPool();
	return resolve(event);
}) satisfies Handle;
