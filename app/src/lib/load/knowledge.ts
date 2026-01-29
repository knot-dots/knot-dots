import { filterVisible } from '$lib/authorization';
import { payloadTypes, predicates } from '$lib/models';
import { getAllRelatedContainers, getManyContainers } from '$lib/server/db';
import { extractCustomCategoryFilters } from '$lib/load/customCategoryFilters';
import type { PageServerLoad } from '../../routes/[guid=uuid]/knowledge/$types';

export default (async function load({ depends, locals, parent, url }) {
	depends('containers');

	let containers;
	const customCategories = extractCustomCategoryFilters(url);
	const { currentOrganization } = await parent();

	if (url.searchParams.has('related-to')) {
		containers = await locals.pool.connect(
			getAllRelatedContainers(
				currentOrganization.payload.default ? [] : [currentOrganization.guid],
				url.searchParams.get('related-to') as string,
				[predicates.enum['is-part-of']],
				{ customCategories, type: [payloadTypes.enum.knowledge] },
				url.searchParams.get('sort') ?? ''
			)
		);
	} else {
		containers = await locals.pool.connect(
			getManyContainers(
				currentOrganization.payload.default ? [] : [currentOrganization.guid],
				{
					customCategories,
					programTypes: url.searchParams.getAll('programType'),
					terms: url.searchParams.get('terms') ?? '',
					type: [payloadTypes.enum.knowledge]
				},
				url.searchParams.get('sort') ?? ''
			)
		);
	}

	return { containers: filterVisible(containers, locals.user) };
} satisfies PageServerLoad);
