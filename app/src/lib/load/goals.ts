import { createFeatureDecisions } from '$lib/features';
import { filterVisible } from '$lib/authorization';
import {
	filterOrganizationalUnits,
	payloadTypes,
	predicates,
	audience,
	computeFacetCount,
	fromCounts,
	policyFieldBNK,
	programTypes,
	sustainableDevelopmentGoals,
	topics
} from '$lib/models';
import {
	getAllRelatedContainers,
	getAllRelatedContainersByProgramType,
	getAllRelatedOrganizationalUnitContainers,
	getManyContainers
} from '$lib/server/db';
import { getManyContainersWithES, getFacetAggregationsForGuids } from '$lib/server/elasticsearch';
import type { PageServerLoad } from '../../routes/[[guid=uuid]]/goals/$types';

export default (async function load({ depends, locals, parent, url }) {
	depends('containers');

	let containers;
	let subordinateOrganizationalUnits: string[] = [];
	const { currentOrganization, currentOrganizationalUnit } = await parent();

	if (currentOrganizationalUnit) {
		const relatedOrganizationalUnits = await locals.pool.connect(
			getAllRelatedOrganizationalUnitContainers(currentOrganizationalUnit.guid)
		);
		subordinateOrganizationalUnits = relatedOrganizationalUnits
			.filter(({ payload }) => payload.level > currentOrganizationalUnit.payload.level)
			.map(({ guid }) => guid);
	}

	if (url.searchParams.has('related-to')) {
		[containers] = await Promise.all([
			locals.pool.connect(
				getAllRelatedContainers(
					currentOrganization.payload.default ? [] : [currentOrganization.guid],
					url.searchParams.get('related-to') as string,
					url.searchParams.getAll('relationType').length == 0
						? [
								predicates.enum['is-consistent-with'],
								predicates.enum['is-equivalent-to'],
								predicates.enum['is-inconsistent-with'],
								predicates.enum['is-part-of']
							]
						: url.searchParams.getAll('relationType'),
					{
						type: [payloadTypes.enum.goal]
					},
					url.searchParams.get('sort') ?? ''
				)
			)
		]);
	} else if (url.searchParams.has('programType')) {
		[containers] = await Promise.all([
			locals.pool.connect(
				getAllRelatedContainersByProgramType(
					currentOrganization.payload.default ? [] : [currentOrganization.guid],
					url.searchParams.getAll('programType'),
					{
						audience: url.searchParams.getAll('audience'),
						categories: url.searchParams.getAll('category'),
						policyFieldsBNK: url.searchParams.getAll('policyFieldBNK'),
						terms: url.searchParams.get('terms') ?? '',
						topics: url.searchParams.getAll('topic'),
						type: [payloadTypes.enum.goal]
					},
					url.searchParams.get('sort') ?? ''
				)
			)
		]);
	} else {
		const features = createFeatureDecisions(locals.features);
		[containers] = await Promise.all([
			locals.pool.connect(
				features.useElasticsearch()
					? getManyContainersWithES(
							currentOrganization.payload.default ? [] : [currentOrganization.guid],
							{
								audience: url.searchParams.getAll('audience'),
								categories: url.searchParams.getAll('category'),
								policyFieldsBNK: url.searchParams.getAll('policyFieldBNK'),
								programTypes: url.searchParams.getAll('programType'),
								topics: url.searchParams.getAll('topic'),
								terms: url.searchParams.get('terms') ?? '',
								type: [payloadTypes.enum.goal]
							},
							url.searchParams.get('sort') ?? ''
						)
					: getManyContainers(
							currentOrganization.payload.default ? [] : [currentOrganization.guid],
							{
								audience: url.searchParams.getAll('audience'),
								categories: url.searchParams.getAll('category'),
								policyFieldsBNK: url.searchParams.getAll('policyFieldBNK'),
								programTypes: url.searchParams.getAll('programType'),
								topics: url.searchParams.getAll('topic'),
								terms: url.searchParams.get('terms') ?? '',
								type: [payloadTypes.enum.goal]
							},
							url.searchParams.get('sort') ?? ''
						)
			)
		]);
	}

	const filtered = filterOrganizationalUnits(
		filterVisible(
			containers.filter(
				({ relation }) =>
					!relation.some(({ predicate }) => predicate === predicates.enum['is-part-of-measure'])
			),
			locals.user
		),
		url,
		subordinateOrganizationalUnits,
		currentOrganizationalUnit
	);

	const features = createFeatureDecisions(locals.features);
	const data = features.useElasticsearch()
		? await getFacetAggregationsForGuids(filtered.map((c) => c.guid))
		: undefined;

	const _facets = new Map<string, Map<string, number>>([
		...((url.searchParams.has('related-to')
			? [
					[
						'relationType',
						new Map([
							[predicates.enum['is-part-of'], 0],
							[predicates.enum['is-consistent-with'], 0],
							[predicates.enum['is-equivalent-to'], 0],
							[predicates.enum['is-inconsistent-with'], 0]
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

	return { containers: filtered, facets };
} satisfies PageServerLoad);
