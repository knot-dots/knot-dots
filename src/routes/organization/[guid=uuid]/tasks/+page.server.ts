import { filterVisible } from '$lib/authorization';
import {
	getAllContainerRevisionsByGuid,
	getAllRelatedInternalObjectives,
	getContainerByGuid,
	getManyTaskContainers,
	maybePartOf
} from '$lib/server/db';
import { predicates } from '$lib/models';
import type { PageServerLoad } from './$types';

export const load = (async ({ locals, params, url }) => {
	let overlayData;

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

	if (url.searchParams.has('container-preview')) {
		const guid = url.searchParams.get('container-preview') ?? '';
		const revisions = await locals.pool.connect(getAllContainerRevisionsByGuid(guid));
		const container = revisions[revisions.length - 1];
		const [isPartOfOptions, relatedContainers] = await Promise.all([
			locals.pool.connect(maybePartOf(container.organization, container.payload.type)),
			locals.pool.connect(
				getAllRelatedInternalObjectives(guid, [], url.searchParams.get('sort') ?? '')
			)
		]);
		overlayData = {
			isPartOfOptions: filterVisible(isPartOfOptions, locals.user),
			relatedContainers: filterVisible(relatedContainers, locals.user),
			revisions
		};
	}

	return {
		container,
		containers: filterVisible(containers, locals.user),
		overlayData
	};
}) satisfies PageServerLoad;
