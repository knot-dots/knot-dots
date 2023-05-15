import type { ContainerType } from '$lib/models';
import { maybePartOf } from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load = (async ({ params, locals }) => {
	const isPartOfOptions = await locals.pool.connect(maybePartOf(params.type as ContainerType));
	return {
		isPartOfOptions
	};
}) satisfies PageServerLoad;
