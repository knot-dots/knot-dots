import { filterVisible } from '$lib/authorization';
import { audience, type IndicatorContainer, payloadTypes } from '$lib/models';
import { getAllContainersRelatedToIndicators, getManyContainers } from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load = (async ({ locals, parent, url }) => {
	let containers: IndicatorContainer[];

	const { currentOrganization } = await parent();

	containers = (await locals.pool.connect(
		getManyContainers(
			[currentOrganization.guid],
			{
				audience: url.searchParams.has('audienceChanged')
					? url.searchParams.getAll('audience')
					: [audience.enum['audience.public'], audience.enum['audience.organization']],
				categories: url.searchParams.getAll('category'),
				indicatorCategories: url.searchParams.getAll('indicatorCategory'),
				indicatorTypes: url.searchParams.getAll('indicatorType'),
				topics: url.searchParams.getAll('topic'),
				type: [payloadTypes.enum.indicator]
			},
			''
		)
	)) as IndicatorContainer[];

	const relatedContainers = await locals.pool.connect(
		getAllContainersRelatedToIndicators(containers)
	);

	return {
		container: currentOrganization,
		containers: filterVisible(
			[...containers, ...relatedContainers],
			locals.user
		) as IndicatorContainer[]
	};
}) satisfies PageServerLoad;
