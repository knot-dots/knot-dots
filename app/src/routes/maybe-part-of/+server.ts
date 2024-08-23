import { error, json } from '@sveltejs/kit';
import { z } from 'zod';
import { payloadTypes } from '$lib/models';
import { maybePartOf } from '$lib/server/db';
import type { RequestHandler } from './$types';
import { filterVisible } from '$lib/authorization';

export const GET = (async ({ locals, url }) => {
	const parseResult = z
		.tuple([z.string().uuid(), payloadTypes])
		.safeParse([url.searchParams.get('organization'), url.searchParams.get('payloadType')]);

	if (!parseResult.success) {
		error(400, { message: parseResult.error.message });
	}

	const containers = await locals.pool.connect(
		maybePartOf(parseResult.data[0], parseResult.data[1])
	);

	return json(filterVisible(containers, locals.user));
}) satisfies RequestHandler;
