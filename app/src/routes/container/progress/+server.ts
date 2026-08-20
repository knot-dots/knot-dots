import { error, json } from '@sveltejs/kit';
import { z } from 'zod';
import { filterVisible } from '$lib/authorization';
import { getAllContainersRelatedToProgress } from '$lib/server/db';
import type { RequestHandler } from './$types';

export const GET = (async ({ locals, url }) => {
	const expectedParams = z.object({
		relatedTo: z.array(z.string().uuid()).min(1)
	});
	const parseResult = expectedParams.safeParse({
		relatedTo: url.searchParams.getAll('relatedTo')
	});
	if (!parseResult.success) {
		error(400, { message: parseResult.error.message });
	}

	const containers = await locals.pool.connect(
		getAllContainersRelatedToProgress(parseResult.data.relatedTo)
	);

	return json(filterVisible(containers, locals.user));
}) satisfies RequestHandler;
