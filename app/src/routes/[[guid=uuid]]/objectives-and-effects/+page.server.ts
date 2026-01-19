import { filterVisible } from '$lib/authorization';
import { audience, type Container, type IndicatorContainer, payloadTypes } from '$lib/models';
import { getAllContainersRelatedToIndicators, getManyContainers } from '$lib/server/db';
import { extractCustomCategoryFilters } from '$lib/load/customCategoryFilters';
import type { PageServerLoad } from './$types';

export const load = (async ({ depends, locals, parent, url }) => {
	depends('containers');

	const { currentOrganization } = await parent();
	const customCategories = extractCustomCategoryFilters(url);
	const containers = (await locals.pool.connect(
		getManyContainers(
			[currentOrganization.guid],
			{
				customCategories,
				indicatorCategories: url.searchParams.getAll('indicatorCategory'),
				indicatorTypes: url.searchParams.getAll('indicatorType'),
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
