import { error, json } from '@sveltejs/kit';
import { _, unwrapFunctionStore } from 'svelte-i18n';
import { env } from '$env/dynamic/public';
import type { User } from '$lib/models';
import { newUser, predicates } from '$lib/models';
import {
	createOrUpdateUser,
	createUser,
	getContainerByGuid,
	getManyOrganizationContainers,
	updateContainer
} from '$lib/server/db';
import { sendVerificationEmail } from '$lib/server/email';
import {
	addUserToGroup,
	createUser as createKeycloakUser,
	findUserByEmail
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
				family_name: lastName?.trim() ?? '',
				given_name: firstName?.trim() ?? '',
				guid: id,
				realm: env.PUBLIC_KC_REALM ?? '',
				settings: {}
			})
		);
	} catch (error) {
		const subject = await createKeycloakUser(parseResult.data.email);
		user = await locals.pool.connect(
			createUser({
				family_name: '',
				given_name: '',
				guid: subject,
				realm: env.PUBLIC_KC_REALM ?? '',
				settings: {}
			})
		);

		const organizations = await locals.pool.connect(
			getManyOrganizationContainers({ default: true }, 'alpha')
		);

		const signupURL = `${env.PUBLIC_BASE_URL}/${organizations[0].guid}/all/page?signup=${user.guid}`;
		await sendVerificationEmail(parseResult.data.email, signupURL);
	}

	await locals.pool.transaction(async (txConnection) => {
		const container = await getContainerByGuid(parseResult.data.container.guid)(txConnection);
		await updateContainer({
			...container,
			managed_by: container.guid,
			user: [
				...parseResult.data.container.user,
				{ subject: user.guid, predicate: predicates.enum['is-member-of'] }
			]
		})(txConnection);
	});

	await addUserToGroup(user, parseResult.data.container.organization);

	return json(user, {
		status: 201,
		headers: { location: `/user/${user.guid}` }
	});
}) satisfies RequestHandler;
