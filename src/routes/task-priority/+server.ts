import { error } from '@sveltejs/kit';
import { _, unwrapFunctionStore } from 'svelte-i18n';
import { z } from 'zod';
import { taskPriority } from '$lib/models';
import type { RequestHandler } from './$types';
import { createOrUpdateTaskPriority } from '$lib/server/db';

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
	} else {
		await locals.pool.connect(createOrUpdateTaskPriority(parseResult.data));
		return new Response(null, { status: 204 });
	}
}) satisfies RequestHandler;
