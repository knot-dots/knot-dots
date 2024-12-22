import { filterVisible } from '$lib/authorization';
import { audience, type Container, filterOrganizationalUnits, predicates } from '$lib/models';
import {
	getAllRelatedContainers,
	getAllRelatedOrganizationalUnitContainers,
	getManyContainers
} from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load = (async ({ locals, url, parent }) => {
	let containers: Container[];
	const { currentOrganization, currentOrganizationalUnit } = await parent();

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
	} else if (
		!url.searchParams.has('programsChanged') ||
		url.searchParams.get('programs') == 'only_related'
	) {
		containers = await filterOrganizationalUnitsAsync(
			locals.pool.connect(
				getManyContainers(
					[currentOrganization.guid],
					{
						audience: url.searchParams.has('audienceChanged')
							? url.searchParams.getAll('audience')
							: [audience.enum['audience.public'], audience.enum['audience.organization']],
						categories: url.searchParams.getAll('category'),
						topics: url.searchParams.getAll('topic'),
						strategyTypes: url.searchParams.getAll('strategyType'),
						terms: url.searchParams.get('terms') ?? '',
						type: ['strategy']
					},
					url.searchParams.get('sort') ?? ''
				)
			)
		);
		const relatedContainers = await Promise.all(
			containers.map(({ guid }) =>
				locals.pool.connect(
					getAllRelatedContainers(
						[],
						guid,
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
			)
		);
		relatedContainers.flat().forEach((c) => {
			if (containers.findIndex(({ guid }) => guid == c.guid) == -1) {
				containers.push(c);
			}
		});
	} else {
		containers = await filterOrganizationalUnitsAsync(
			locals.pool.connect(
				getManyContainers(
					[],
					{
						audience: url.searchParams.has('audienceChanged')
							? url.searchParams.getAll('audience')
							: [audience.enum['audience.public'], audience.enum['audience.organization']],
						categories: url.searchParams.getAll('category'),
						topics: url.searchParams.getAll('topic'),
						strategyTypes: url.searchParams.getAll('strategyType'),
						terms: url.searchParams.get('terms') ?? '',
						type: ['strategy']
					},
					url.searchParams.get('sort') ?? ''
				)
			)
		);
	}

	return { containers: filterVisible(containers, locals.user) };
}) satisfies PageServerLoad;
