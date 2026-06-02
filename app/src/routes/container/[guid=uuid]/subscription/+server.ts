import { error, json } from '@sveltejs/kit';
import { unwrapFunctionStore, _ } from 'svelte-i18n';
import { z } from 'zod';
import { predicates } from '$lib/models';
import {
	createManyContainerRelations,
	deleteManyContainerRelations,
	getContainerByGuid,
	getSubscribedProgramGuids,
	sql
} from '$lib/server/db';
import type { RequestHandler } from '@sveltejs/kit';

const subscriptionBody = z.object({
	organizations: z.array(z.string().uuid()).min(1)
});

export const GET: RequestHandler = async ({ locals, params }) => {
	if (!locals.user.isAuthenticated) {
		error(401, { message: unwrapFunctionStore(_)('error.unauthorized') });
	}

	const guid = params.guid!;

	const subscriptions = await locals.pool.connect(getSubscribedProgramGuids([guid]));

	return json(subscriptions.filter((r) => r.object === guid));
};

export const POST: RequestHandler = async ({ locals, params, request }) => {
	if (!locals.user.isAuthenticated) {
		error(401, { message: unwrapFunctionStore(_)('error.unauthorized') });
	}

	const guid = params.guid!;

	if (request.headers.get('Content-Type') !== 'application/json') {
		error(415, { message: unwrapFunctionStore(_)('error.unsupported_media_type') });
	}

	const data = await request.json().catch((reason: SyntaxError) => {
		error(400, { message: reason.message });
	});

	const parseResult = subscriptionBody.safeParse(data);
	if (!parseResult.success) {
		error(422, parseResult.error);
	}

	const container = await locals.pool.connect(getContainerByGuid(guid));

	if (container.payload.visibility !== 'public') {
		error(403, { message: unwrapFunctionStore(_)('error.forbidden') });
	}

	const isSysadmin = locals.user.roles.includes('sysadmin');
	const allowedOrgs = new Set([...locals.user.adminOf, ...locals.user.headOf]);

	for (const orgGuid of parseResult.data.organizations) {
		if (!isSysadmin && !allowedOrgs.has(orgGuid)) {
			error(403, { message: unwrapFunctionStore(_)('error.forbidden') });
		}
		if (orgGuid === container.organization || orgGuid === container.organizational_unit) {
			error(400, { message: unwrapFunctionStore(_)('error.bad_request') });
		}
	}

	const relations = parseResult.data.organizations.map((orgGuid) => ({
		object: guid,
		position: 0,
		predicate: predicates.enum['is-subscribed-to'],
		subject: orgGuid
	}));

	await locals.pool.connect(async (connection) => {
		const values = relations.map((r) => [r.object, r.predicate, r.subject]);
		await connection.query(sql.typeAlias('void')`
			UPDATE container_relation cr
			SET valid_currently = false
			FROM ${sql.unnest(values, ['uuid', 'text', 'uuid'])} AS u(object, predicate, subject)
			WHERE cr.object = u.object
			  AND cr.predicate = u.predicate
			  AND cr.subject = u.subject
			  AND cr.valid_currently
			  AND cr.deleted
		`);
		await createManyContainerRelations(relations)(connection);
	});

	return new Response(null, { status: 204 });
};

export const DELETE: RequestHandler = async ({ locals, params, request }) => {
	if (!locals.user.isAuthenticated) {
		error(401, { message: unwrapFunctionStore(_)('error.unauthorized') });
	}

	const guid = params.guid!;

	if (request.headers.get('Content-Type') !== 'application/json') {
		error(415, { message: unwrapFunctionStore(_)('error.unsupported_media_type') });
	}

	const data = await request.json().catch((reason: SyntaxError) => {
		error(400, { message: reason.message });
	});

	const parseResult = subscriptionBody.safeParse(data);
	if (!parseResult.success) {
		error(422, parseResult.error);
	}

	const isSysadmin = locals.user.roles.includes('sysadmin');
	const allowedOrgs = new Set([...locals.user.adminOf, ...locals.user.headOf]);

	for (const orgGuid of parseResult.data.organizations) {
		if (!isSysadmin && !allowedOrgs.has(orgGuid)) {
			error(403, { message: unwrapFunctionStore(_)('error.forbidden') });
		}
	}

	const relations = parseResult.data.organizations.map((orgGuid) => ({
		object: guid,
		position: 0,
		predicate: predicates.enum['is-subscribed-to'],
		subject: orgGuid
	}));

	await locals.pool.connect(deleteManyContainerRelations(relations));

	return new Response(null, { status: 204 });
};
