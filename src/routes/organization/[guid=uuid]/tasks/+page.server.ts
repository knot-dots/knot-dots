import { filterVisible } from '$lib/authorization';
import { getContainerByGuid, getManyTaskContainers } from '$lib/server/db';
import { predicates } from '$lib/models';
import type { PageServerLoad } from './$types';

export const load = (async ({ locals, params, url }) => {
	const container = await locals.pool.connect(getContainerByGuid(params.guid));

	let containers = await locals.pool.connect(
		getManyTaskContainers({
			organization: container.organization,
			taskCategories: url.searchParams.getAll('taskCategory'),
			terms: url.searchParams.get('terms') ?? ''
		})
	);

	containers = containers.filter(({ relation, organizational_unit }) => {
		if (
			!url.searchParams.getAll('included').includes('is-part-of-measure') &&
			relation.some(({ predicate }) => predicate == predicates.enum['is-part-of-measure'])
		) {
			return false;
		}

		if (
			!url.searchParams.getAll('included').includes('subordinate-organizational-units') &&
			organizational_unit
		) {
			return false;
		}

		return true;
	});

	return {
		container,
		containers: filterVisible(containers, locals.user)
	};
}) satisfies PageServerLoad;
