import { json } from '@sveltejs/kit';
import { loadContainerV2 } from '$lib/server/containerQuery';
import type { RequestHandler } from './$types';

export const GET = (async ({ locals, url }) => {
	return json(
		await loadContainerV2({
			locals,
			url
		})
	);
}) satisfies RequestHandler;
