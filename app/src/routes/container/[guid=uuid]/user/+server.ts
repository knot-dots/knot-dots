import { error, json } from '@sveltejs/kit';
import { unwrapFunctionStore, _ } from 'svelte-i18n';
import { z } from 'zod';
import { predicates, userRelation } from '$lib/models';
import type { AnyContainer } from '$lib/models';
import { getAllRelatedUsers, getContainerByGuid, updateContainer } from '$lib/server/db';
import type { RequestHandler } from './$types';
import { NotFoundError } from 'slonik';
import { getMembers } from '$lib/server/keycloak';

export const GET = (async ({ locals, params }) => {
	if (!locals.user.isAuthenticated) {
		error(401, { message: unwrapFunctionStore(_)('error.unauthorized') });
	}

	const [container, users] = await Promise.all([
		locals.pool.connect(getContainerByGuid(params.guid)),
		locals.pool.connect(getAllRelatedUsers(params.guid, [predicates.enum['is-member-of']]))
	]);

	const members = await getMembers(container.organization);

	return json(
		users.map((u) => ({
			...u,
			email: members.find(({ id }) => id == u.guid)?.username ?? u.guid
		}))
	);
}) satisfies RequestHandler;

export const POST = (async ({ locals, params, request }) => {
	let container: AnyContainer;

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

	await locals.pool.connect(
		updateContainer({
			...container,
			managed_by:
				container.managed_by == container.guid && parseResult.data.length == 0
					? (container.organizational_unit ?? container.organization)
					: container.managed_by,
			user: parseResult.data
		})
	);

	return new Response(null, { status: 204 });
}) satisfies RequestHandler;
