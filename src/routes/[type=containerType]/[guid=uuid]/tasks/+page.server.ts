import { env } from '$env/dynamic/public';
import { filterVisible } from '$lib/authorization';
import { containerOfType } from '$lib/models';
import type { AnyContainer, PayloadType } from '$lib/models';
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
			taskCategories: url.searchParams.getAll('taskCategory'),
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

	return { container, containers: filterVisible(containers, locals.user), overlayData };
}) satisfies PageServerLoad;
