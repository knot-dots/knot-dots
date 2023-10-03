import { error } from '@sveltejs/kit';
import { _, unwrapFunctionStore } from 'svelte-i18n';
import { z } from 'zod';
import { relation } from '$lib/models';
import { updateContainerRelationPosition } from '$lib/server/db';
import type { RequestHandler } from './$types';

export const POST = (async ({ locals, request }) => {
	if (!locals.user.isAuthenticated) {
		throw error(401, { message: unwrapFunctionStore(_)('error.unauthorized') });
	}

	if (request.headers.get('Content-Type') != 'application/json') {
		throw error(415, { message: unwrapFunctionStore(_)('error.unsupported_media_type') });
	}

	const data = await request.json().catch((reason: SyntaxError) => {
		throw error(400, { message: reason.message });
	});
	const parseResult = z.array(relation).safeParse(data);

	if (!parseResult.success) {
		throw error(422, parseResult.error);
	} else {
		await locals.pool.connect(updateContainerRelationPosition(parseResult.data));
		return new Response(null, { status: 204 });
	}
}) satisfies RequestHandler;
