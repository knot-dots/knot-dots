import { error } from '@sveltejs/kit';
import { _, unwrapFunctionStore } from 'svelte-i18n';
import { env } from '$env/dynamic/public';
import type { RequestHandler } from './$types';

export const POST = (async ({ cookies }) => {
	if (!cookies.get('idToken') || !cookies.get('refreshToken') || !cookies.get('token')) {
		error(404, { message: unwrapFunctionStore(_)('error.not_found') });
	}

	const url = new URL(env.PUBLIC_BASE_URL ?? '');
	const cookieOpts = { domain: url.hostname, path: '/' };

	cookies.delete('idToken', cookieOpts);
	cookies.delete('refreshToken', cookieOpts);
	cookies.delete('token', cookieOpts);

	return new Response(null, { status: 204 });
}) satisfies RequestHandler;
