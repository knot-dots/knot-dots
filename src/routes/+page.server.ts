import { filterVisible } from '$lib/authorization';
import { audience, filterOrganizationalUnits } from '$lib/models';
import {
	getAllContainersWithIndicatorContributions,
	getAllRelatedContainers,
	getAllRelatedContainersByStrategyType,
	getAllRelatedOrganizationalUnitContainers,
	getManyContainers
} from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load = (async ({ locals, url, parent }) => {
	let containers;
	let containersWithIndicatorContributions;
	let subordinateOrganizationalUnits: string[] = [];
	const { currentOrganization, currentOrganizationalUnit } = await parent();

	if (currentOrganizationalUnit) {
		const relatedOrganizationalUnits = await locals.pool.connect(
			getAllRelatedOrganizationalUnitContainers(currentOrganizationalUnit.guid)
		);
		subordinateOrganizationalUnits = relatedOrganizationalUnits
			.filter(({ payload }) => payload.level >= currentOrganizationalUnit.payload.level)
			.map(({ guid }) => guid);
	}

	if (url.searchParams.has('related-to')) {
		[containers, containersWithIndicatorContributions] = await Promise.all([
			locals.pool.connect(
				getAllRelatedContainers(
					currentOrganization.payload.default ? [] : [currentOrganization.guid],
					url.searchParams.get('related-to') as string,
					url.searchParams.getAll('relationType').length == 0
						? ['hierarchical', 'other']
						: url.searchParams.getAll('relationType'),
					{},
					url.searchParams.get('sort') ?? ''
				)
			),
			locals.pool.connect(
				getAllContainersWithIndicatorContributions(
					currentOrganization.payload.default ? [] : [currentOrganization.guid]
				)
			)
		]);
	} else if (url.searchParams.has('strategyType')) {
		[containers, containersWithIndicatorContributions] = await Promise.all([
			locals.pool.connect(
				getAllRelatedContainersByStrategyType(
					currentOrganization.payload.default ? [] : [currentOrganization.guid],
					url.searchParams.getAll('strategyType'),
					{
						audience: url.searchParams.has('audienceChanged')
							? url.searchParams.getAll('audience')
							: [audience.enum['audience.public'], audience.enum['audience.organization']],
						categories: url.searchParams.getAll('category'),
						topics: url.searchParams.getAll('topic'),
						terms: url.searchParams.get('terms') ?? ''
					},
					url.searchParams.get('sort') ?? ''
				)
			),
			locals.pool.connect(
				getAllContainersWithIndicatorContributions(
					currentOrganization.payload.default ? [] : [currentOrganization.guid]
				)
			)
		]);
	} else {
		[containers, containersWithIndicatorContributions] = await Promise.all([
			locals.pool.connect(
				getManyContainers(
					currentOrganization.payload.default ? [] : [currentOrganization.guid],
					{
						audience: url.searchParams.has('audienceChanged')
							? url.searchParams.getAll('audience')
							: [audience.enum['audience.public'], audience.enum['audience.organization']],
						categories: url.searchParams.getAll('category'),
						topics: url.searchParams.getAll('topic'),
						strategyTypes: url.searchParams.getAll('strategyType'),
						terms: url.searchParams.get('terms') ?? ''
					},
					url.searchParams.get('sort') ?? ''
				)
			),
			locals.pool.connect(
				getAllContainersWithIndicatorContributions(
					currentOrganization.payload.default ? [] : [currentOrganization.guid]
				)
			)
		]);
	}

	return {
		containers: filterOrganizationalUnits(
			filterVisible(containers, locals.user),
			url,
			subordinateOrganizationalUnits,
			currentOrganizationalUnit
		),
		containersWithIndicatorContributions: filterVisible(
			containersWithIndicatorContributions,
			locals.user
		)
	};
}) satisfies PageServerLoad;
