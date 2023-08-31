import {
	getAllContainerRevisionsByGuid,
	getAllRelatedInternalObjectives,
	getAllRelatedOrganizationalUnitContainers,
	getContainerByGuid,
	getManyContainers,
	maybePartOf
} from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load = (async ({ locals, params, parent, url }) => {
	let organizationalUnits: string[] = [];
	let overlayData;
	const container = await locals.pool.connect(getContainerByGuid(params.guid));

	const { currentOrganizationalUnit } = await parent();

	if (currentOrganizationalUnit) {
		const relatedOrganizationalUnits = await locals.pool.connect(
			getAllRelatedOrganizationalUnitContainers(currentOrganizationalUnit.guid)
		);
		organizationalUnits = relatedOrganizationalUnits
			.filter(({ payload }) => payload.level >= currentOrganizationalUnit.payload.level)
			.map(({ guid }) => guid);
	}

	const containers = await locals.pool.connect(
		getManyContainers(
			[container.organization],
			{
				organizationalUnits,
				terms: url.searchParams.get('terms') ?? '',
				type: ['internal_objective.task']
			},
			url.searchParams.get('sort') ?? ''
		)
	);

	if (url.searchParams.has('container-preview')) {
		const guid = url.searchParams.get('container-preview') ?? '';
		const revisions = await locals.pool.connect(getAllContainerRevisionsByGuid(guid));
		const container = revisions[revisions.length - 1];
		const [isPartOfOptions, relatedContainers] = await Promise.all([
			locals.pool.connect(
				maybePartOf(container.organizational_unit ?? container.organization, container.payload.type)
			),
			locals.pool.connect(getAllRelatedInternalObjectives(guid, url.searchParams.get('sort') ?? ''))
		]);
		overlayData = { isPartOfOptions, relatedContainers, revisions };
	}

	return { container, containers, overlayData };
}) satisfies PageServerLoad;
