import { error, json } from '@sveltejs/kit';
import type { DatabaseConnection } from 'slonik';
import { _, unwrapFunctionStore } from 'svelte-i18n';
import { newUser } from '$lib/models';
import { createUser as createKeycloakUser } from '$lib/server/keycloak';
import { createUser } from '$lib/server/db';
import type { RequestHandler } from './$types';

export const POST = (async ({ locals, request }) => {
	if (locals.user == null) {
		throw error(401, { message: unwrapFunctionStore(_)('error.unauthorized') });
	}

	if (request.headers.get('Content-Type') != 'application/json') {
		throw error(415, { message: unwrapFunctionStore(_)('error.unsupported_media_type') });
	}

	const data = await request.json().catch((reason: SyntaxError) => {
		throw error(400, { message: reason.message });
	});
	const parseResult = newUser.safeParse(data);

	if (!parseResult.success) {
		throw error(422, parseResult.error);
	} else {
		const result = await locals.pool.connect(async (connection: DatabaseConnection) => {
			const subject = await createKeycloakUser(parseResult.data);
			return createUser({
				display_name: `${parseResult.data.firstName} ${parseResult.data.lastName}`,
				realm: parseResult.data.realm,
				subject
			})(connection);
		});

		return json(result, { status: 201, headers: { location: `/user/${result.subject}` } });
	}
}) satisfies RequestHandler;
