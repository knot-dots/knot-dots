import { error } from '@sveltejs/kit';
import { unwrapFunctionStore, _ } from 'svelte-i18n';
import defineAbilityFor from '$lib/authorization';
import {
	type AnyPayload,
	type Container,
	findAncestors,
	memberRoleAssignment,
	memberRoleOf,
	memberRoles,
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
		!defineAbilityFor(locals.user).can('invite-members', container)
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

	// administrators are managed in the list views only
	if (memberRoleOf({ guid: subject }, container) === memberRoles.enum.administrator) {
		error(422, { message: unwrapFunctionStore(_)('error.unprocessable_entity') });
	}

	await locals.pool.connect(updateMemberRole(container, subject, role));

	return new Response(null, { status: 204 });
}) satisfies RequestHandler;
