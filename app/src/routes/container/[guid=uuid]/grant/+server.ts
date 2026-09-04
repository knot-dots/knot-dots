import { error } from '@sveltejs/kit';
import { unwrapFunctionStore, _ } from 'svelte-i18n';
import defineAbilityFor from '$lib/authorization';
import {
	type AnyPayload,
	type Container,
	findAncestors,
	memberRoleAssignment,
	memberRoles,
	payloadTypes,
	predicates
} from '$lib/models';
import {
	getContainerByGuid,
	getManyOrganizationalUnitContainers,
	updateMemberRole
} from '$lib/server/db';
import type { RequestHandler } from './$types';
import { NotFoundError } from 'slonik';

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

	if (
		!locals.user.roles.includes('sysadmin') &&
		!defineAbilityFor(locals.user).can('manage-users', container)
	) {
		const organizationalUnits = await locals.pool.connect(
			getManyOrganizationalUnitContainers({ include: { organization: container.organization } })
		);
		const managedByUser = findAncestors<Container<AnyPayload>>(container, organizationalUnits, [
			predicates.enum['is-part-of']
		]).some(({ guid }) => locals.user.adminOf.includes(guid));
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

	const parseResult = memberRoleAssignment.safeParse(data);
	if (!parseResult.success) {
		error(422, parseResult.error);
	}

	const { role, subject } = parseResult.data;

	// administrators exist on organizations and organizational units only
	if (
		role === memberRoles.enum.administrator &&
		container.payload.type !== payloadTypes.enum.organization &&
		container.payload.type !== payloadTypes.enum.organizational_unit
	) {
		error(422, { message: unwrapFunctionStore(_)('error.unprocessable_entity') });
	}

	// the last administrator may not be demoted or removed
	const admins = new Set(
		container.user
			.filter(({ predicate }) => predicate === predicates.enum['is-admin-of'])
			.map(({ subject: adminSubject }) => adminSubject)
	);
	if (role !== memberRoles.enum.administrator && admins.has(subject) && admins.size === 1) {
		error(422, { message: unwrapFunctionStore(_)('error.unprocessable_entity') });
	}

	await locals.pool.connect(updateMemberRole(container, subject, role));

	return new Response(null, { status: 204 });
}) satisfies RequestHandler;
