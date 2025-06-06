import { filterVisible } from '$lib/authorization';
import { type KnowledgeContainer, payloadTypes } from '$lib/models';
import { getManyContainers } from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load = (async ({ locals, parent, url }) => {
	const { currentOrganization } = await parent();
	const containers = (await locals.pool.connect(
		getManyContainers(
			[currentOrganization.guid],
			{
				audience: url.searchParams.getAll('audience'),
				categories: url.searchParams.getAll('category'),
				policyFieldsBNK: url.searchParams.getAll('policyFieldBNK'),
				topics: url.searchParams.getAll('topic'),
				type: [payloadTypes.enum.knowledge]
			},
			''
		)
	)) as KnowledgeContainer[];

	return {
		containers: filterVisible(containers, locals.user)
	};
}) satisfies PageServerLoad;
