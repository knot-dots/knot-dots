import { filterVisible } from '$lib/authorization';
import { audience, filterOrganizationalUnits, payloadTypes } from '$lib/models';
import {
	getAllRelatedContainersByStrategyType,
	getAllRelatedOrganizationalUnitContainers,
	getManyContainers
} from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load = (async ({ locals, url, parent }) => {
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

	if (url.searchParams.has('strategyType')) {
		containers = await locals.pool.connect(
			getAllRelatedContainersByStrategyType(
				currentOrganization.payload.default ? [] : [currentOrganization.guid],
				url.searchParams.getAll('strategyType'),
				{
					audience: url.searchParams.has('audienceChanged')
						? url.searchParams.getAll('audience')
						: [audience.enum['audience.public'], audience.enum['audience.organization']],
					categories: url.searchParams.getAll('category'),
					topics: url.searchParams.getAll('topic'),
					terms: url.searchParams.get('terms') ?? '',
					type: [payloadTypes.enum.resolution]
				},
				url.searchParams.get('sort') ?? ''
			)
		);
	} else {
		containers = await locals.pool.connect(
			getManyContainers(
				currentOrganization.payload.default ? [] : [currentOrganization.guid],
				{
					audience: url.searchParams.has('audienceChanged')
						? url.searchParams.getAll('audience')
						: [audience.enum['audience.public'], audience.enum['audience.organization']],
					categories: url.searchParams.getAll('category'),
					topics: url.searchParams.getAll('topic'),
					strategyTypes: url.searchParams.getAll('strategyType'),
					terms: url.searchParams.get('terms') ?? '',
					type: [payloadTypes.enum.resolution]
				},
				url.searchParams.get('sort') ?? ''
			)
		);
	}

	return {
		containers: filterOrganizationalUnits(
			filterVisible(containers, locals.user),
			url,
			subordinateOrganizationalUnits,
			currentOrganizationalUnit
		)
	};
}) satisfies PageServerLoad;
