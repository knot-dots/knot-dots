import { error, json } from '@sveltejs/kit';
import { Roarr as log } from 'roarr';
import { isErrorLike, serializeError } from 'serialize-error';
import { unwrapFunctionStore, _ } from 'svelte-i18n';
import { z } from 'zod';
import defineAbilityFor from '$lib/authorization';
import {
	type AnyPayload,
	type Container,
	findAncestors,
	predicates,
	userRelation
} from '$lib/models';
import {
	getAllRelatedUsers,
	getContainerByGuid,
	getManyOrganizationalUnitContainers,
	updateContainer
} from '$lib/server/db';
import type { RequestHandler } from './$types';
import { NotFoundError } from 'slonik';
import { getMembers } from '$lib/server/keycloak';

export const GET = (async ({ locals, params, url }) => {
	if (!locals.user.isAuthenticated) {
		error(401, { message: unwrapFunctionStore(_)('error.unauthorized') });
	}

	const container = await locals.pool.connect(getContainerByGuid(params.guid));

	// with ?registered the response lists everyone registered in the
	// organization (i.e. the members of its Keycloak group) instead of the
	// users related to this container
	if (url.searchParams.has('registered')) {
		try {
			const members = await getMembers(container.organization);
			return json(members.filter(({ enabled }) => enabled));
		} catch (error) {
			log.error(isErrorLike(error) ? serializeError(error) : {}, String(error));
			return json([]);
		}
	}

	const users = await locals.pool.connect(
		getAllRelatedUsers(params.guid, [predicates.enum['is-member-of']])
	);

	try {
		const members = await getMembers(container.organization);
		return json(
			users.map((u) => ({
				...u,
				email: members.find(({ id }) => id == u.guid)?.username
			}))
		);
	} catch (error) {
		log.error(isErrorLike(error) ? serializeError(error) : {}, String(error));
		return json(users);
	}
}) satisfies RequestHandler;

export const POST = (async ({ locals, params, request }) => {
	let container: Container<AnyPayload>;

	try {
		container = await locals.pool.connect(getContainerByGuid(params.guid));
	} catch (e) {
		if (e instanceof NotFoundError) {
			error(404, { message: unwrapFunctionStore(_)('error.not_found') });
		} else {
			throw e;
		}
	}

	if (!locals.user.isAuthenticated) {
		error(401, { message: unwrapFunctionStore(_)('error.unauthorized') });
	}

	if (
		!locals.user.roles.includes('sysadmin') &&
		!defineAbilityFor(locals.user).can('manage-users', container)
	) {
		const organizationalUnits = await locals.pool.connect(
			getManyOrganizationalUnitContainers({ include: { organization: container.organization } })
		);
		const managedByUser = findAncestors<Container<AnyPayload>>(container, organizationalUnits, [
			predicates.enum['is-part-of']
		]).some(({ guid }) => locals.user.grants.self['manage-users'].includes(guid));
		if (!managedByUser) {
			error(403, { message: unwrapFunctionStore(_)('error.forbidden') });
		}
	}

	if (request.headers.get('Content-Type') != 'application/json') {
		error(415, { message: unwrapFunctionStore(_)('error.unsupported_media_type') });
	}

	const data = await request.json().catch((reason: SyntaxError) => {
		error(400, { message: reason.message });
	});

	const parseResult = z.array(userRelation).safeParse(data);
	if (!parseResult.success) {
		error(422, parseResult.error);
	}

	const updatedUserRelation = parseResult.data.filter(
		({ predicate }) => predicate != predicates.enum['is-creator-of']
	);

	if (!locals.user.roles.includes('sysadmin')) {
		const previousAdmins = container.user
			.filter(({ predicate }) => predicate == predicates.enum['is-admin-of'])
			.map(({ subject }) => subject);
		const nextAdmins = updatedUserRelation
			.filter(({ predicate }) => predicate == predicates.enum['is-admin-of'])
			.map(({ subject }) => subject);

		// administrators may not be removed or demoted
		if (previousAdmins.some((subject) => !nextAdmins.includes(subject))) {
			error(422, { message: unwrapFunctionStore(_)('error.unprocessable_entity') });
		}

		// appointing administrators is reserved for administrators of the scope
		if (
			nextAdmins.some((subject) => !previousAdmins.includes(subject)) &&
			!locals.user.grants.self['manage-users'].includes(container.guid) &&
			!locals.user.grants.self['manage-users'].includes(container.organization)
		) {
			error(403, { message: unwrapFunctionStore(_)('error.forbidden') });
		}
	}

	await locals.pool.connect(
		updateContainer({
			...container,
			managed_by:
				container.managed_by[0] == container.guid && updatedUserRelation.length == 0
					? [container.organizational_unit ?? container.organization]
					: container.managed_by,
			user: [
				{
					predicate: predicates.enum['is-creator-of'],
					subject: locals.user.guid
				},
				...updatedUserRelation
			]
		})
	);

	return new Response(null, { status: 204 });
}) satisfies RequestHandler;
