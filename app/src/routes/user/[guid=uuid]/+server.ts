import { error, json } from '@sveltejs/kit';
import { _, unwrapFunctionStore } from 'svelte-i18n';
import { type User, user as userSchema } from '$lib/models';
import { createOrUpdateUser } from '$lib/server/db';
import type { RequestHandler } from './$types';
import { updateUser } from '$lib/server/keycloak';

export const PUT = (async ({ locals, request }) => {
	if (!locals.user.isAuthenticated) {
		error(401, { message: unwrapFunctionStore(_)('error.unauthorized') });
	}

	if (request.headers.get('Content-Type') != 'application/json') {
		error(415, { message: unwrapFunctionStore(_)('error.unsupported_media_type') });
	}

	const data = await request.json().catch((reason: SyntaxError) => {
		error(400, { message: reason.message });
	});
	const parseResult = userSchema.safeParse(data);

	if (!parseResult.success) {
		error(422, parseResult.error);
	}

	let user: User;

	[user] = await Promise.all([
		locals.pool.connect(createOrUpdateUser(parseResult.data)),
		updateUser(parseResult.data)
	]);

	return json(user, { status: 200, headers: { location: `/user/${user.guid}` } });
}) satisfies RequestHandler;
