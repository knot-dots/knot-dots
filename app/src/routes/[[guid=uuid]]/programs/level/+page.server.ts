import { filterVisible } from '$lib/authorization';
import {
	type Container,
	filterOrganizationalUnits,
	payloadTypes,
	predicates,
	computeFacetCount,
	audience,
	fromCounts,
	policyFieldBNK,
	programTypes,
	sustainableDevelopmentGoals,
	topics
} from '$lib/models';
import {
	getAllRelatedContainers,
	getAllRelatedOrganizationalUnitContainers,
	getManyContainers
} from '$lib/server/db';
import { getManyContainersWithES, getFacetAggregationsForGuids } from '$lib/server/elasticsearch';
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
		containers = filterVisible(containers, locals.user);
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
		containers = filterVisible(containers, locals.user);
	}

	const data = features.useElasticsearch()
		? await getFacetAggregationsForGuids(containers.map((c) => c.guid))
		: undefined;

	const _facets = new Map<string, Map<string, number>>([
		...((url.searchParams.has('related-to')
			? [
					[
						'relationType',
						new Map([
							[predicates.enum['is-consistent-with'], 0],
							[predicates.enum['is-equivalent-to'], 0],
							[predicates.enum['is-inconsistent-with'], 0],
							[predicates.enum['is-superordinate-of'], 0]
						])
					]
				]
			: []) as Array<[string, Map<string, number>]>),
		...((!currentOrganization.payload.default ? [['included', new Map()]] : []) as Array<
			[string, Map<string, number>]
		>),
		['audience', fromCounts(audience.options as string[], data?.audience)],
		['category', fromCounts(sustainableDevelopmentGoals.options as string[], data?.category)],
		['topic', fromCounts(topics.options as string[], data?.topic)],
		['policyFieldBNK', fromCounts(policyFieldBNK.options as string[], data?.policyFieldBNK)],
		['programType', fromCounts(programTypes.options as string[], data?.programType)]
	]);

	const facets = features.useElasticsearch() ? _facets : computeFacetCount(_facets, containers);

	return { containers, facets };
}) satisfies PageServerLoad;
