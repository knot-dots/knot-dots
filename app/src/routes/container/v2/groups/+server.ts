import { json } from '@sveltejs/kit';
import { loadContainerGroupsV2 } from '$lib/server/containerQuery';
import type { RequestHandler } from './$types';

export const GET = (async (event) => {
	return json(await loadContainerGroupsV2(event));
}) satisfies RequestHandler;
