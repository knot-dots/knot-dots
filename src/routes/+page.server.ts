import { filterVisible } from '$lib/authorization';
import { audience, type OrganizationalUnitContainer, predicates } from '$lib/models';
import type { Container } from '$lib/models';
import {
	getAllContainersWithIndicatorContributions,
	getAllRelatedContainers,
	getAllRelatedContainersByStrategyType,
	getAllRelatedOrganizationalUnitContainers,
	getManyContainers
} from '$lib/server/db';
import type { PageServerLoad } from './$types';

function filterOrganizationalUnitsAndMeasures(
	containers: Container[],
	url: URL,
	currentOrganizationalUnit?: OrganizationalUnitContainer
) {
	return url.searchParams.has('related-to')
		? containers
		: containers.filter((c) => {
				if (
					!url.searchParams.getAll('included').includes('is-part-of-measure') &&
					c.relation.some(
						({ predicate, subject }) =>
							predicate == predicates.enum['is-part-of-measure'] && subject == c.revision
					)
				) {
					return false;
				}

				if (
					!url.searchParams.getAll('included').includes('subordinate-organizational-units') &&
					c.organizational_unit != null &&
					c.organizational_unit != currentOrganizationalUnit?.guid
				) {
					return false;
				}

				return true;
		  });
}

export const load = (async ({ locals, url, parent }) => {
	let containers;
	let containersWithIndicatorContributions;
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
		[containers, containersWithIndicatorContributions] = await Promise.all([
			locals.pool.connect(
				getAllRelatedContainers(
					currentOrganization.payload.default ? [] : [currentOrganization.guid],
					url.searchParams.get('related-to') as string,
					url.searchParams.getAll('relationType').length == 0
						? ['hierarchical', 'other']
						: url.searchParams.getAll('relationType'),
					{ organizationalUnits },
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
						organizationalUnits,
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
						organizationalUnits,
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
		containers: filterOrganizationalUnitsAndMeasures(
			filterVisible(containers, locals.user),
			url,
			currentOrganizationalUnit
		),
		containersWithIndicatorContributions: filterVisible(
			containersWithIndicatorContributions,
			locals.user
		)
	};
}) satisfies PageServerLoad;
