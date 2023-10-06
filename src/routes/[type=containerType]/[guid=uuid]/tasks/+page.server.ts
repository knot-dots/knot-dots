import { filterVisible } from '$lib/authorization';
import {
	getAllContainerRevisionsByGuid,
	getAllRelatedInternalObjectives,
	getContainerByGuid,
	maybePartOf,
	getManyTaskContainers
} from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load = (async ({ locals, params, url }) => {
	let overlayData;
	const container = await locals.pool.connect(getContainerByGuid(params.guid));
	const containers = await locals.pool.connect(
		getManyTaskContainers({
			measure: container.revision,
			terms: url.searchParams.get('terms') ?? ''
		})
	);
	if (url.searchParams.has('container-preview')) {
		const guid = url.searchParams.get('container-preview') ?? '';
		const revisions = await locals.pool.connect(getAllContainerRevisionsByGuid(guid));
		const container = revisions[revisions.length - 1];
		const [isPartOfOptions, relatedContainers] = await Promise.all([
			locals.pool.connect(
				maybePartOf(container.organizational_unit ?? container.organization, container.payload.type)
			),
			locals.pool.connect(
				getAllRelatedInternalObjectives(params.guid, [], url.searchParams.get('sort') ?? '')
			)
		]);
		overlayData = {
			isPartOfOptions,
			relatedContainers,
			revisions
		};
	}
	return { container, containers: filterVisible(containers, locals.user), overlayData };
}) satisfies PageServerLoad;
