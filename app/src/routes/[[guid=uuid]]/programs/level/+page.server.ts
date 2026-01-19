import { filterVisible } from '$lib/authorization';
import { type Container, filterOrganizationalUnits, payloadTypes, predicates } from '$lib/models';
import {
	getAllRelatedContainers,
	getAllRelatedOrganizationalUnitContainers,
	getManyContainers
} from '$lib/server/db';
import { extractCustomCategoryFilters } from '$lib/load/customCategoryFilters';
import type { PageServerLoad } from './$types';

export const load = (async ({ locals, url, parent }) => {
	let containers: Container[];
	const customCategories = extractCustomCategoryFilters(url);
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
					{ customCategories },
					url.searchParams.get('sort') ?? ''
				)
			)
		);
		return { containers: filterVisible(containers, locals.user) };
	} else {
		const items = await locals.pool.connect(
			getManyContainers(
				[],
				{
					customCategories,
					programTypes: url.searchParams.getAll('programType'),
					terms: url.searchParams.get('terms') ?? '',
					type: [payloadTypes.enum.program]
				},
				url.searchParams.get('sort') ?? ''
			)
		);
		containers = await filterOrganizationalUnitsAsync(Promise.resolve(items));
		return { containers: filterVisible(containers, locals.user) };
	}
	// Unreachable, but keep a safe fallback
	return { containers: filterVisible(containers, locals.user) };
}) satisfies PageServerLoad;
