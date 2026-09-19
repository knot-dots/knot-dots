import { error } from '@sveltejs/kit';
import { unwrapFunctionStore, _ } from 'svelte-i18n';
import { z } from 'zod';
import defineAbilityFor from '$lib/authorization';
import {
	type AnyPayload,
	type Container,
	findAncestors,
	grantSourceOf,
	predicates
} from '$lib/models';
import {
	getContainerByGuid,
	getManyOrganizationalUnitContainers,
	updateContainer
} from '$lib/server/db';
import type { RequestHandler } from './$types';
import { NotFoundError } from 'slonik';

const grantInheritanceRequest = z.object({ inherit: z.boolean() });

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

		// Decoupling starts with an empty matrix of the object's own; nothing is
		// copied. A container managed by its inheritance source would remain
		// reachable through the source's subordinate grants via managed_by even
		// when decoupled, so it becomes self-managed.
		const source = grantSourceOf(container);
		const managedBy = container.managed_by[0] === source ? [container.guid] : container.managed_by;

		await updateContainer({
			...container,
			managed_by: managedBy,
			payload: { ...payload, inheritsGrants: false }
		})(connection);
	});

	return new Response(null, { status: 204 });
}) satisfies RequestHandler;
