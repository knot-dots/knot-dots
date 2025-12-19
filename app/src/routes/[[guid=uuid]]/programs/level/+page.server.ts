import { filterVisible } from '$lib/authorization';
import { type Container, filterOrganizationalUnits, payloadTypes, predicates } from '$lib/models';
import {
	getAllRelatedContainers,
	getAllRelatedOrganizationalUnitContainers,
	getManyContainers,
	getManyContainersWithES,
	getFacetAggregationsForGuids
} from '$lib/server/db';
import { createFeatureDecisions } from '$lib/features';
import type { PageServerLoad } from './$types';

export const load = (async ({ locals, url, parent }) => {
	let containers: Container[];
	const { currentOrganization, currentOrganizationalUnit } = await parent();
	const features = createFeatureDecisions(locals.features);

	async function filterOrganizationalUnitsAsync<T extends Container>(promise: Promise<Array<T>>) {
		let subordinateOrganizationalUnits: string[] = [];

		const containers = await promise;

		if (currentOrganizationalUnit) {
			const relatedOrganizationalUnits = await locals.pool.connect(
				getAllRelatedOrganizationalUnitContainers(currentOrganizationalUnit.guid)
			);
			subordinateOrganizationalUnits = relatedOrganizationalUnits
				.filter(({ payload }) => payload.level > currentOrganizationalUnit.payload.level)
				.map(({ guid }) => guid);
		}

		return [
			...containers.filter(({ organization }) => organization != currentOrganization.guid),
			...filterOrganizationalUnits(
				containers.filter(({ organization }) => organization == currentOrganization.guid),
				url,
				subordinateOrganizationalUnits,
				currentOrganizationalUnit
			)
		];
	}

	if (url.searchParams.has('related-to')) {
		containers = await filterOrganizationalUnitsAsync(
			locals.pool.connect(
				getAllRelatedContainers(
					[],
					url.searchParams.get('related-to') as string,
					url.searchParams.getAll('relationType').length == 0
						? [
								predicates.enum['is-consistent-with'],
								predicates.enum['is-equivalent-to'],
								predicates.enum['is-inconsistent-with'],
								predicates.enum['is-superordinate-of']
							]
						: url.searchParams.getAll('relationType'),
					{},
					url.searchParams.get('sort') ?? ''
				)
			)
		);
	} else {
		containers = await filterOrganizationalUnitsAsync(
			locals.pool.connect(
				features.useElasticsearch()
					? getManyContainersWithES(
							[],
							{
								audience: url.searchParams.getAll('audience'),
								categories: url.searchParams.getAll('category'),
								policyFieldsBNK: url.searchParams.getAll('policyFieldBNK'),
								programTypes: url.searchParams.getAll('programType'),
								terms: url.searchParams.get('terms') ?? '',
								topics: url.searchParams.getAll('topic'),
								type: [payloadTypes.enum.program]
							},
							url.searchParams.get('sort') ?? ''
						)
					: getManyContainers(
							[],
							{
								audience: url.searchParams.getAll('audience'),
								categories: url.searchParams.getAll('category'),
								policyFieldsBNK: url.searchParams.getAll('policyFieldBNK'),
								programTypes: url.searchParams.getAll('programType'),
								terms: url.searchParams.get('terms') ?? '',
								topics: url.searchParams.getAll('topic'),
								type: [payloadTypes.enum.program]
							},
							url.searchParams.get('sort') ?? ''
						)
			)
		);
	}

	const filtered = filterVisible(containers, locals.user);

	const facets = features.useElasticsearch()
		? await getFacetAggregationsForGuids(filtered.map((c) => c.guid))
		: {};

	return { containers: filtered, facets };
}) satisfies PageServerLoad;
