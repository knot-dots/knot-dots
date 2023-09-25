import {
	getAllContainerRevisionsByGuid,
	getAllRelatedInternalObjectives,
	getContainerByGuid,
	getManyTaskContainers,
	maybePartOf
} from '$lib/server/db';
import type { PageServerLoad } from './$types';
import { predicates } from '$lib/models';

export const load = (async ({ locals, params, url }) => {
	let overlayData;

	const container = await locals.pool.connect(getContainerByGuid(params.guid));

	let containers = await locals.pool.connect(
		getManyTaskContainers({
			organization: container.organization,
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
		overlayData = { isPartOfOptions, relatedContainers, revisions };
	}

	return { container, containers, overlayData };
}) satisfies PageServerLoad;
