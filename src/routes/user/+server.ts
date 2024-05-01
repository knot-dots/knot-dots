import { error, json } from '@sveltejs/kit';
import { _, unwrapFunctionStore } from 'svelte-i18n';
import { env } from '$env/dynamic/public';
import { newUser } from '$lib/models';
import type { User } from '$lib/models';
import { createOrUpdateUser, createUser } from '$lib/server/db';
import {
	addUserToGroup,
	createUser as createKeycloakUser,
	findUserByEmail,
	sendVerificationEmail
} from '$lib/server/keycloak';
import type { RequestHandler } from './$types';

export const POST = (async ({ locals, request }) => {
	if (!locals.user.isAuthenticated) {
		error(401, { message: unwrapFunctionStore(_)('error.unauthorized') });
	}

	if (request.headers.get('Content-Type') != 'application/json') {
		error(415, { message: unwrapFunctionStore(_)('error.unsupported_media_type') });
	}

	const data = await request.json().catch((reason: SyntaxError) => {
		error(400, { message: reason.message });
	});
	const parseResult = newUser.safeParse(data);

	if (!parseResult.success) {
		error(422, parseResult.error);
	}

	let user: User;

	try {
		const { firstName, id, lastName } = await findUserByEmail(parseResult.data.email);
		user = await locals.pool.connect(
			createOrUpdateUser({
				display_name: `${firstName} ${lastName}`.trim(),
				guid: id,
				realm: env.PUBLIC_KC_REALM ?? ''
			})
		);
	} catch (error) {
		const subject = await createKeycloakUser(parseResult.data);
		user = await locals.pool.connect(
			createUser({
				display_name: '',
				realm: parseResult.data.realm,
				guid: subject
			})
		);
		await sendVerificationEmail(user);
	}

	await addUserToGroup(user, parseResult.data.organization);

	return json(user, { status: 201, headers: { location: `/user/${user.guid}` } });
}) satisfies RequestHandler;
