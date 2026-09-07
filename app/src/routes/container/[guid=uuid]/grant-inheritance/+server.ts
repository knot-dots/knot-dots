import { error } from '@sveltejs/kit';
import { unwrapFunctionStore, _ } from 'svelte-i18n';
import { z } from 'zod';
import defineAbilityFor from '$lib/authorization';
import {
	type AnyPayload,
	type Container,
	findAncestors,
	grantSetForSubjectOn,
	memberRoleFromGrantSet,
	memberRolePredicates,
	memberRoles,
	type Predicate,
	predicates,
	userRelationsForMemberRole
} from '$lib/models';
import {
	getAllGrantsByContainers,
	getContainerByGuid,
	getManyOrganizationalUnitContainers,
	setContainerGrants,
	updateContainer
} from '$lib/server/db';
import type { RequestHandler } from './$types';
import { NotFoundError } from 'slonik';

const grantInheritanceRequest = z.object({ inherit: z.boolean() });

const memberRoleRelationPredicates = new Set<Predicate>([
	...Object.values(memberRolePredicates),
	predicates.enum['is-member-of']
]);

export const POST = (async ({ locals, params, request }) => {
	if (!locals.user.isAuthenticated) {
		error(401, { message: unwrapFunctionStore(_)('error.unauthorized') });
	}

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

	const payload = container.payload;
	if (!('inheritsGrants' in payload)) {
		error(422, { message: unwrapFunctionStore(_)('error.unprocessable_entity') });
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

	const parseResult = grantInheritanceRequest.safeParse(data);
	if (!parseResult.success) {
		error(422, parseResult.error);
	}

	const { inherit } = parseResult.data;

	if (inherit === payload.inheritsGrants) {
		return new Response(null, { status: 204 });
	}

	await locals.pool.connect(async (connection) => {
		if (inherit) {
			// re-enabling keeps the individually granted rows; they simply become
			// read-only additions next to the inherited matrix again
			await updateContainer({
				...container,
				payload: { ...payload, inheritsGrants: true }
			})(connection);
			return;
		}

		// Copy-on-write: the matrix of the scope becomes the starting point of
		// the object's own matrix. Subjects with own rows keep them; scope
		// administrators are not copied — they may neither be removed nor
		// changed and keep their access through the authorization rules.
		const scope = container.organizational_unit ?? container.organization;
		const [scopeGrants, ownGrants] = await Promise.all([
			getAllGrantsByContainers([scope])(connection),
			getAllGrantsByContainers([container.guid])(connection)
		]);

		const copiedSubjects = [...new Set(scopeGrants.map(({ subject }) => subject))]
			.filter((subject) => !ownGrants.some((grant) => grant.subject === subject))
			.map((subject) => ({
				subject,
				set: grantSetForSubjectOn(scopeGrants, scope, subject)
			}))
			.filter(({ set }) => memberRoleFromGrantSet(set) !== memberRoles.enum.administrator);

		await updateContainer({
			...container,
			payload: { ...payload, inheritsGrants: false },
			user: [
				...container.user.filter(
					({ predicate, subject }) =>
						!memberRoleRelationPredicates.has(predicate) ||
						!copiedSubjects.some((copied) => copied.subject === subject)
				),
				...copiedSubjects.flatMap(({ set, subject }) => {
					const role = memberRoleFromGrantSet(set);
					return role === null ? [] : userRelationsForMemberRole(role, subject);
				})
			]
		})(connection);

		for (const { set, subject } of copiedSubjects) {
			await setContainerGrants(container.guid, subject, set)(connection);
		}
	});

	return new Response(null, { status: 204 });
}) satisfies RequestHandler;
