import { env } from '$env/dynamic/public';
import { filterVisible } from '$lib/authorization';
import { containerOfType } from '$lib/models';
import type { AnyContainer, PayloadType } from '$lib/models';
import {
	getAllContainersRelatedToMeasure,
	getAllContainerRevisionsByGuid,
	getAllRelatedInternalObjectives,
	getContainerByGuid,
	maybePartOf
} from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load = (async ({ locals, params, url }) => {
	let containers;
	let overlayData;
	let relationOverlayData;
	const container = await locals.pool.connect(getContainerByGuid(params.guid));

	if (url.searchParams.has('related-to')) {
		containers = await locals.pool.connect(
			getAllRelatedInternalObjectives(
				url.searchParams.get('related-to') as string,
				url.searchParams.getAll('relations').length == 0
					? ['hierarchical', 'other']
					: url.searchParams.getAll('relations'),
				''
			)
		);
	} else {
		containers = await locals.pool.connect(
			getAllContainersRelatedToMeasure(
				container.revision,
				{ terms: url.searchParams.get('terms') ?? '' },
				url.searchParams.get('sort') ?? ''
			)
		);
	}

	if (url.searchParams.has('container-preview')) {
		const guid = url.searchParams.get('container-preview') ?? '';
		const revisions = await locals.pool.connect(getAllContainerRevisionsByGuid(guid));
		const container = revisions[revisions.length - 1];
		const [isPartOfOptions, relatedContainers] = await Promise.all([
			locals.pool.connect(
				maybePartOf(container.organizational_unit ?? container.organization, container.payload.type)
			),
			locals.pool.connect(getAllRelatedInternalObjectives(guid, ['hierarchical'], ''))
		]);
		overlayData = {
			isPartOfOptions: filterVisible(isPartOfOptions, locals.user),
			relatedContainers: filterVisible(relatedContainers, locals.user),
			revisions
		};
	} else if (url.searchParams.has('container-relations')) {
		const guid = url.searchParams.get('container-relations') ?? '';
		const revisions = await locals.pool.connect(getAllContainerRevisionsByGuid(guid));
		const container = revisions[revisions.length - 1];
		relationOverlayData = { object: container };
	} else if (url.searchParams.has('overlay-new')) {
		const newContainer = containerOfType(
			url.searchParams.get('overlay-new') as PayloadType,
			container.organization,
			container.organizational_unit ?? null,
			env.PUBLIC_KC_REALM
		);
		const isPartOfOptions = await locals.pool.connect(
			maybePartOf(
				container.organizational_unit ?? container.organization,
				newContainer.payload.type
			)
		);
		overlayData = {
			isPartOfOptions: filterVisible(isPartOfOptions, locals.user),
			relatedContainers: [],
			revisions: [newContainer] as AnyContainer[]
		};
	}

	return {
		container,
		containers: filterVisible(containers, locals.user),
		overlayData,
		relationOverlayData
	};
}) satisfies PageServerLoad;
