import type { Handle, HandleServerError } from '@sveltejs/kit';
import { Roarr as log } from 'roarr';
import { serializeError } from 'serialize-error';
import { _, locale, unwrapFunctionStore } from 'svelte-i18n';
import { getPool } from '$lib/server/db';

export const handle = (async ({ event, resolve }) => {
	const lang = event.request.headers.get('accept-language')?.split(',')[0];
	if (lang) {
		locale.set(lang);
	}
	event.locals.pool = await getPool();
	return resolve(event);
}) satisfies Handle;

export const handleError = (async ({ error }) => {
	log.error(serializeError(error), String(error));
	return {
		message: unwrapFunctionStore(_)('error.unexpected')
	};
}) satisfies HandleServerError;
