import { filterVisible } from '$lib/authorization';
import {
	getAllContainersWithIndicatorContributions,
	getAllRelatedContainers,
	getAllRelatedInternalObjectives,
	getContainerByGuid
} from '$lib/server/db';
import type { PageServerLoad } from './$types';
import { audience } from '$lib/models';

export const load = (async ({ params, locals, url }) => {
	const container = await locals.pool.connect(getContainerByGuid(params.guid));

	const [containersWithIndicatorContributions, containers] = await Promise.all([
		locals.pool.connect(getAllContainersWithIndicatorContributions([container.organization])),
		params.type.includes('internal_objective')
			? locals.pool.connect(
					getAllRelatedInternalObjectives(
						params.guid,
						['hierarchical'],
						url.searchParams.get('sort') ?? ''
					)
			  )
			: locals.pool.connect(
					getAllRelatedContainers(
						[container.organization],
						params.guid,
						['hierarchical'],
						{
							audience: url.searchParams.has('audienceChanged')
								? url.searchParams.getAll('audience')
								: [audience.enum['audience.public']],
							categories: url.searchParams.getAll('category'),
							topics: url.searchParams.getAll('topic'),
							strategyTypes: url.searchParams.getAll('strategyType'),
							terms: url.searchParams.get('terms') ?? ''
						},
						url.searchParams.get('sort') ?? ''
					)
			  )
	]);

	return {
		containers: filterVisible(containers, locals.user),
		container,
		containersWithIndicatorContributions: filterVisible(
			containersWithIndicatorContributions,
			locals.user
		)
	};
}) satisfies PageServerLoad;
