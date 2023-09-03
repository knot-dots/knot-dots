import { error, json } from '@sveltejs/kit';
import { _, unwrapFunctionStore } from 'svelte-i18n';
import type { RequestHandler } from './$types';

export const GET = (async ({ cookies }) => {
	if (!cookies.get('idToken') || !cookies.get('refreshToken') || !cookies.get('token')) {
		throw error(404, { message: unwrapFunctionStore(_)('error.not_found') });
	}

	return json({
		idToken: cookies.get('idToken'),
		refreshToken: cookies.get('refreshToken'),
		token: cookies.get('token')
	});
}) satisfies RequestHandler;
