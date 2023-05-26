import { getAllRelatedContainers, getManyContainersByType } from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load = (async ({ locals, url }) => {
	if (url.searchParams.has('related-to')) {
		const containers = await locals.pool.connect(
			getAllRelatedContainers(url.searchParams.get('related-to') as string)
		);
		return { containers };
	} else {
		const containers = await locals.pool.connect(
			getManyContainersByType(
				'measure',
				url.searchParams.getAll('category'),
				url.searchParams.get('sort') ?? ''
			)
		);
		return { containers };
	}
}) satisfies PageServerLoad;
