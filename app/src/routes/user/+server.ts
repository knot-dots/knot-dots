import { error, json } from '@sveltejs/kit';
import { _, unwrapFunctionStore } from 'svelte-i18n';
import { env } from '$env/dynamic/public';
import defineAbilityFor from '$lib/authorization';
import type { Predicate, User } from '$lib/models';
import {
	memberRolePredicates,
	memberRoles,
	newUser,
	payloadTypes,
	predicates,
	userRelationsForMemberRole
} from '$lib/models';
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

	const ability = defineAbilityFor(locals.user);

	const data = await request.json().catch((reason: SyntaxError) => {
		error(400, { message: reason.message });
	});

	const parseResult = newUser.safeParse(data);
	if (!parseResult.success) {
		error(422, parseResult.error);
	}

	const container = await locals.pool.transaction(
		getContainerByGuid(parseResult.data.container.guid)
	);

	if (!ability.can('manage-users', container)) {
		error(403, { message: unwrapFunctionStore(_)('error.forbidden') });
	}

	const role = parseResult.data.role ?? memberRoles.enum.observer;

	if (
		role === memberRoles.enum.administrator &&
		container.payload.type !== payloadTypes.enum.organization &&
		container.payload.type !== payloadTypes.enum.organizational_unit
	) {
		error(422, { message: unwrapFunctionStore(_)('error.unprocessable_entity') });
	}

	let user: User;

	try {
		const { firstName, id, lastName } = await findUserByEmail(parseResult.data.email);
		user = await locals.pool.connect(
			createOrUpdateUser(
				{
					family_name: lastName?.trim() ?? '',
					given_name: firstName?.trim() ?? '',
					guid: id,
					realm: env.PUBLIC_KC_REALM ?? '',
					settings: {}
				},
				true
			)
		);
	} catch {
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

		const signupURL = `${env.PUBLIC_BASE_URL}/${organizations[0].guid}?signup=${user.guid}`;
		await sendVerificationEmail(parseResult.data.email, signupURL);
	}

	const roleRelationPredicates = new Set<Predicate>([
		...Object.values(memberRolePredicates),
		predicates.enum['is-member-of']
	]);

	await locals.pool.transaction(
		updateContainer({
			...container,
			managed_by: [container.guid],
			user: [
				...parseResult.data.container.user.filter(
					({ predicate, subject }) =>
						subject !== user.guid || !roleRelationPredicates.has(predicate)
				),
				...userRelationsForMemberRole(role, user.guid)
			]
		})
	);

	await addUserToGroup(user, parseResult.data.container.organization);

	return json(user, {
		status: 201,
		headers: { location: `/user/${user.guid}` }
	});
}) satisfies RequestHandler;
