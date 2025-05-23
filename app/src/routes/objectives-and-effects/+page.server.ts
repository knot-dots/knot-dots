import { filterVisible } from '$lib/authorization';
import { audience, type Container, type IndicatorContainer, payloadTypes } from '$lib/models';
import { getAllContainersRelatedToIndicators, getManyContainers } from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load = (async ({ locals, parent, url }) => {
	const { currentOrganization } = await parent();
	const containers = (await locals.pool.connect(
		getManyContainers(
			[currentOrganization.guid],
			{
				audience: url.searchParams.getAll('audience'),
				categories: url.searchParams.getAll('category'),
				indicatorCategories: url.searchParams.getAll('indicatorCategory'),
				indicatorTypes: url.searchParams.getAll('indicatorType'),
				policyFieldsBNK: url.searchParams.getAll('policyFieldBNK'),
				topics: url.searchParams.getAll('topic'),
				type: [payloadTypes.enum.indicator]
			},
			''
		)
	)) as IndicatorContainer[];

	const relatedContainers = await locals.pool.connect(
		getAllContainersRelatedToIndicators(containers, {})
	);

	return {
		container: currentOrganization,
		containers: filterVisible([...containers, ...relatedContainers], locals.user)
	};
}) satisfies PageServerLoad;
