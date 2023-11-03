import { filterVisible } from '$lib/authorization';
import {
	getAllRelatedContainers,
	getAllRelatedContainersByStrategyType,
	getAllRelatedOrganizationalUnitContainers,
	getManyContainers
} from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load = (async ({ locals, url, parent }) => {
	let containers;
	let organizationalUnits: string[] = [];
	const { currentOrganization, currentOrganizationalUnit } = await parent();

	if (currentOrganizationalUnit) {
		const relatedOrganizationalUnits = await locals.pool.connect(
			getAllRelatedOrganizationalUnitContainers(currentOrganizationalUnit.guid)
		);
		organizationalUnits = relatedOrganizationalUnits
			.filter(({ payload }) => payload.level >= currentOrganizationalUnit.payload.level)
			.map(({ guid }) => guid);
	}

	if (url.searchParams.has('related-to')) {
		containers = await locals.pool.connect(
			getAllRelatedContainers(
				currentOrganization.payload.default ? [] : [currentOrganization.guid],
				url.searchParams.get('related-to') as string,
				url.searchParams.getAll('relations').length == 0
					? ['hierarchical', 'other']
					: url.searchParams.getAll('relations'),
				{ organizationalUnits },
				''
			)
		);
	} else if (url.searchParams.has('strategyType')) {
		containers = await locals.pool.connect(
			getAllRelatedContainersByStrategyType(
				currentOrganization.payload.default ? [] : [currentOrganization.guid],
				url.searchParams.getAll('strategyType'),
				{
					categories: url.searchParams.getAll('category'),
					organizationalUnits,
					topics: url.searchParams.getAll('topic'),
					terms: url.searchParams.get('terms') ?? ''
				},
				url.searchParams.get('sort') ?? ''
			)
		);
	} else {
		containers = await locals.pool.connect(
			getManyContainers(
				currentOrganization.payload.default ? [] : [currentOrganization.guid],
				{
					categories: url.searchParams.getAll('category'),
					organizationalUnits,
					topics: url.searchParams.getAll('topic'),
					strategyTypes: url.searchParams.getAll('strategyType'),
					terms: url.searchParams.get('terms') ?? '',
					type: ['measure']
				},
				url.searchParams.get('sort') ?? ''
			)
		);
	}

	return { containers: filterVisible(containers, locals.user) };
}) satisfies PageServerLoad;
