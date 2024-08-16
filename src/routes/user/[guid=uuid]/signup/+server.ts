import { error } from '@sveltejs/kit';
import { NotFoundError } from 'slonik';
import { _, unwrapFunctionStore } from 'svelte-i18n';
import type { User } from '$lib/models';
import { getUser } from '$lib/server/db';
import { confirmUser } from '$lib/server/keycloak';
import type { RequestHandler } from './$types';

export const POST = (async ({ locals, params, request}) => {
	if (request.headers.get('Content-Type') != 'application/json') {
		error(415, { message: unwrapFunctionStore(_)('error.unsupported_media_type') });
	}

	const { familyName, givenName, password } = await request.json().catch((reason: SyntaxError) => {
		error(400, { message: reason.message });
	});

	let user: User;

	try {
		user = await locals.pool.connect(getUser(params.guid))
	} catch (e) {
		if (e instanceof NotFoundError) {
			error(404, { message: unwrapFunctionStore(_)('error.not_found') });
		} else {
			throw e;
		}
	}

	await confirmUser(user.guid, givenName, familyName, password);
	return new Response(null, { status: 204 })
}) satisfies RequestHandler;
