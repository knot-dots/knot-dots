import { error, json } from '@sveltejs/kit';
import { Roarr as log } from 'roarr';
import { isErrorLike, serializeError } from 'serialize-error';
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

	const updatedUserRelation = parseResult.data.filter(
		({ predicate }) => predicate != predicates.enum['is-creator-of']
	);

	await locals.pool.connect(
		updateContainer({
			...container,
			managed_by:
				container.managed_by == container.guid && updatedUserRelation.length == 0
					? (container.organizational_unit ?? container.organization)
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
