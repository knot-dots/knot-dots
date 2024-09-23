import { error, json } from '@sveltejs/kit';
import { _, unwrapFunctionStore } from 'svelte-i18n';
import { env } from '$env/dynamic/public';
import { createFeatureDecisions } from '$lib/features';
import type { User } from '$lib/models';
import { newUser, predicates } from '$lib/models';
import {
	createOrUpdateUser,
	createUser,
	getContainerByGuid,
	updateContainer
} from '$lib/server/db';
import { sendVerificationEmail as sendVerificationEmailNewWorkflow } from '$lib/server/email';
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
				family_name: lastName?.trim() ?? '',
				given_name: firstName?.trim() ?? '',
				guid: id,
				realm: env.PUBLIC_KC_REALM ?? ''
			})
		);
	} catch (error) {
		const subject = await createKeycloakUser(parseResult.data.email);
		user = await locals.pool.connect(
			createUser({
				family_name: '',
				given_name: '',
				guid: subject,
				realm: env.PUBLIC_KC_REALM ?? ''
			})
		);

		if (createFeatureDecisions(locals.features).useNewOnboardingWorkflow()) {
			const signupURL = `${env.PUBLIC_BASE_URL}?signup=${user.guid}`;
			await sendVerificationEmailNewWorkflow(parseResult.data.email, signupURL);
		} else {
			const redirectURL = new URL(env.PUBLIC_BASE_URL ?? '');
			redirectURL.hostname = `${parseResult.data.container.organization}.${redirectURL.hostname}`;
			await sendVerificationEmail(user, redirectURL.toString());
		}
	}

	await locals.pool.transaction(async (txConnection) => {
		const container = await getContainerByGuid(parseResult.data.container.guid)(txConnection);
		await updateContainer({
			...container,
			managed_by: container.guid,
			relation: container.relation
				.filter((r) => ('guid' in container ? r.subject == container.revision : true))
				.map(({ object, position, predicate }) => ({
					predicate,
					object,
					position
				})),
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
