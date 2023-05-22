import { error, json } from '@sveltejs/kit';
import { _, unwrapFunctionStore } from 'svelte-i18n';
import { modifiedContainer } from '$lib/models';
import { updateContainer } from '$lib/server/db';
import type { RequestHandler } from './$types';

export const POST = (async ({ locals, request }) => {
	if (locals.user == null) {
		throw error(401, { message: unwrapFunctionStore(_)('error.unauthorized') });
	}

	if (request.headers.get('Content-Type') != 'application/json') {
		throw error(415, { message: unwrapFunctionStore(_)('error.unsupported_media_type') });
	}

	const data = await request.json().catch((reason: SyntaxError) => {
		throw error(400, { message: reason.message });
	});
	const parseResult = modifiedContainer.safeParse(data);

	if (!parseResult.success) {
		throw error(422, parseResult.error);
	} else {
		const result = await locals.pool.connect(
			updateContainer({ ...parseResult.data, user: [locals.user] })
		);
		return json(result, { status: 201, headers: { location: `/container/${result.guid}` } });
	}
}) satisfies RequestHandler;
