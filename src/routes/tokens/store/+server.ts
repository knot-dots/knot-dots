import { error } from '@sveltejs/kit';
import { _, unwrapFunctionStore } from 'svelte-i18n';
import { env } from '$env/dynamic/public';
import { tokens } from '$lib/authentication';
import type { RequestHandler } from './$types';

export const POST = (async ({ cookies, locals, request }) => {
	if (!locals.user.isAuthenticated) {
		throw error(401, { message: unwrapFunctionStore(_)('error.unauthorized') });
	}

	if (request.headers.get('Content-Type') != 'application/json') {
		throw error(415, { message: unwrapFunctionStore(_)('error.unsupported_media_type') });
	}

	const data = await request.json().catch((reason: SyntaxError) => {
		throw error(400, { message: reason.message });
	});
	const parseResult = tokens.safeParse(data);

	if (!parseResult.success) {
		throw error(422, parseResult.error);
	} else {
		const url = new URL(env.PUBLIC_BASE_URL ?? '');
		const cookieOpts = { domain: url.hostname, path: '/', secure: url.protocol === 'https' };

		cookies.set('idToken', parseResult.data.idToken, cookieOpts);
		cookies.set('refreshToken', parseResult.data.refreshToken, cookieOpts);
		cookies.set('token', parseResult.data.refreshToken, cookieOpts);

		return new Response(null, { status: 204 });
	}
}) satisfies RequestHandler;
