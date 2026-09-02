import { error } from '@sveltejs/kit';
import { _, unwrapFunctionStore } from 'svelte-i18n';
import { z } from 'zod';
import defineAbilityFor from '$lib/authorization';
import { taskPriority } from '$lib/models';
import type { RequestHandler } from './$types';
import { createOrUpdateTaskPriority, getManyContainers } from '$lib/server/db';

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
	const parseResult = z.array(taskPriority).safeParse(data);

	if (!parseResult.success) {
		error(422, parseResult.error);
	}

	// prioritizing requires the update permission on each task; entries the
	// user may not update are silently skipped, in line with the relation and
	// bulk-action routes
	const ability = defineAbilityFor(locals.user);
	const tasks = await locals.pool.connect(
		getManyContainers([], { guid: parseResult.data.map(({ task }) => task) }, 'alpha')
	);
	const authorized = parseResult.data.filter(({ task }) => {
		const container = tasks.find(({ guid }) => guid === task);
		return container !== undefined && ability.can('update', container);
	});

	if (authorized.length > 0) {
		await locals.pool.connect(createOrUpdateTaskPriority(authorized));
	}

	return new Response(null, { status: 204 });
}) satisfies RequestHandler;
