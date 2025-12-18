import { filterVisible } from '$lib/authorization';
import { filterOrganizationalUnits, payloadTypes, predicates } from '$lib/models';
import {
	getAllRelatedContainers,
	getAllRelatedContainersByProgramType,
	getAllRelatedOrganizationalUnitContainers,
	getManyContainers,
	getFacetAggregationsForGuids
} from '$lib/server/db';
import { createFeatureDecisions } from '$lib/features';
import type { PageServerLoad } from '../../routes/[[guid=uuid]]/all/$types';

export default (async function load({ depends, locals, url, parent }) {
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
		containers = await locals.pool.connect(
			getAllRelatedContainers(
				currentOrganization.payload.default ? [] : [currentOrganization.guid],
				url.searchParams.get('related-to') as string,
				url.searchParams.getAll('relationType').length == 0
					? [
							predicates.enum['contributes-to'],
							predicates.enum['is-consistent-with'],
							predicates.enum['is-equivalent-to'],
							predicates.enum['is-inconsistent-with'],
							predicates.enum['is-part-of']
						]
					: url.searchParams.getAll('relationType'),
				{
					type: [
						payloadTypes.enum.effect,
						payloadTypes.enum.goal,
						payloadTypes.enum.indicator,
						payloadTypes.enum.measure,
						payloadTypes.enum.program,
						payloadTypes.enum.rule,
						payloadTypes.enum.simple_measure
					]
				},
				url.searchParams.get('sort') ?? ''
			)
		);
	} else if (url.searchParams.has('programType')) {
		containers = await locals.pool.connect(
			getAllRelatedContainersByProgramType(
				currentOrganization.payload.default ? [] : [currentOrganization.guid],
				url.searchParams.getAll('programType'),
				{
					audience: url.searchParams.getAll('audience'),
					categories: url.searchParams.getAll('category'),
					policyFieldsBNK: url.searchParams.getAll('policyFieldBNK'),
					terms: url.searchParams.get('terms') ?? '',
					topics: url.searchParams.getAll('topic'),
					type: [
						payloadTypes.enum.effect,
						payloadTypes.enum.goal,
						payloadTypes.enum.indicator,
						payloadTypes.enum.measure,
						payloadTypes.enum.program,
						payloadTypes.enum.rule,
						payloadTypes.enum.simple_measure
					]
				},
				url.searchParams.get('sort') ?? ''
			)
		);
	} else {
		containers = await locals.pool.connect(
			getManyContainers(
				currentOrganization.payload.default ? [] : [currentOrganization.guid],
				{
					audience: url.searchParams.getAll('audience'),
					categories: url.searchParams.getAll('category'),
					policyFieldsBNK: url.searchParams.getAll('policyFieldBNK'),
					programTypes: url.searchParams.getAll('programType'),
					terms: url.searchParams.get('terms') ?? '',
					topics: url.searchParams.getAll('topic'),
					type: [
						payloadTypes.enum.effect,
						payloadTypes.enum.goal,
						payloadTypes.enum.indicator,
						payloadTypes.enum.measure,
						payloadTypes.enum.program,
						payloadTypes.enum.rule,
						payloadTypes.enum.simple_measure
					]
				},
				url.searchParams.get('sort') ?? ''
			)
		);
	}

	const filtered = filterOrganizationalUnits(
		filterVisible(containers, locals.user),
		url,
		subordinateOrganizationalUnits,
		currentOrganizationalUnit
	);

	const features = createFeatureDecisions(locals.features);
	const facets = features.useElasticsearch()
		? await getFacetAggregationsForGuids(filtered.map((c) => c.guid))
		: {};

	return { containers: filtered, facets };
} satisfies PageServerLoad);
