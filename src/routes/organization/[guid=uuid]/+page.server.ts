import { error } from '@sveltejs/kit';
import { _, unwrapFunctionStore } from 'svelte-i18n';
import { filterVisible } from '$lib/authorization';
import { isOrganizationContainer, payloadTypes } from '$lib/models';
import {
	getAllContainerRevisionsByGuid,
	getAllRelatedContainers,
	getContainerByGuid,
	getManyContainers,
	maybePartOf
} from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load = (async ({ params, locals, url }) => {
	const container = await locals.pool.connect(getContainerByGuid(params.guid));
	let overlayData;

	if (!isOrganizationContainer(container)) {
		throw error(404, unwrapFunctionStore(_)('error.not_found'));
	}

	const [strategies, measures] = await Promise.all([
		locals.pool.connect(
			getManyContainers([container.guid], { type: [payloadTypes.enum.strategy] }, '')
		),
		locals.pool.connect(
			getManyContainers([container.guid], { type: [payloadTypes.enum.measure] }, '')
		)
	]);

	if (url.searchParams.has('container-preview')) {
		const guid = url.searchParams.get('container-preview') ?? '';
		const revisions = await locals.pool.connect(getAllContainerRevisionsByGuid(guid));
		const container = revisions[revisions.length - 1];
		const [isPartOfOptions, relatedContainers] = await Promise.all([
			locals.pool.connect(maybePartOf(container.organization, container.payload.type)),
			locals.pool.connect(
				getAllRelatedContainers([container.organization], guid, ['hierarchical'], {}, '')
			)
		]);
		overlayData = {
			isPartOfOptions: filterVisible(isPartOfOptions, locals.user),
			relatedContainers: filterVisible(relatedContainers, locals.user),
			revisions
		};
	}

	return { container, measures, overlayData, strategies };
}) satisfies PageServerLoad;
