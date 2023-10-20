import { env } from '$env/dynamic/public';
import { filterVisible } from '$lib/authorization';
import {
	getAllContainerRevisionsByGuid,
	getAllRelatedContainers,
	getAllRelatedOrganizationalUnitContainers,
	getManyContainers,
	maybePartOf
} from '$lib/server/db';
import { containerOfType } from '$lib/models';
import type { AnyContainer, PayloadType } from '$lib/models';
import type { PageServerLoad } from './$types';

export const load = (async ({ locals, url, parent }) => {
	let containers;
	let organizationalUnits: string[] = [];
	let overlayData;
	let relationOverlayData;
	const { currentOrganization, currentOrganizationalUnit } = await parent();

	if (currentOrganizationalUnit) {
		const relatedOrganizationalUnits = await locals.pool.connect(
			getAllRelatedOrganizationalUnitContainers(currentOrganizationalUnit.guid)
		);
		organizationalUnits = relatedOrganizationalUnits
			.filter(({ payload }) => payload.level >= currentOrganizationalUnit.payload.level)
			.map(({ guid }) => guid);
	}

	if (url.searchParams.has('related-to')) {
		containers = await locals.pool.connect(
			getAllRelatedContainers(
				currentOrganization.payload.default ? [] : [currentOrganization.guid],
				url.searchParams.get('related-to') as string,
				url.searchParams.getAll('relations').length == 0
					? ['hierarchical', 'other']
					: url.searchParams.getAll('relations'),
				{ organizationalUnits },
				''
			)
		);
	} else {
		containers = await locals.pool.connect(
			getManyContainers(
				currentOrganization.payload.default ? [] : [currentOrganization.guid],
				{
					categories: url.searchParams.getAll('category'),
					organizationalUnits,
					topics: url.searchParams.getAll('topic'),
					strategyTypes: url.searchParams.getAll('strategyType'),
					terms: url.searchParams.get('terms') ?? '',
					type: ['strategy']
				},
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
			locals.pool.connect(
				getAllRelatedContainers(
					[container.organization],
					guid,
					['hierarchical'],
					{ organizationalUnits },
					''
				)
			)
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
		const emptyContainer = containerOfType(
			url.searchParams.get('overlay-new') as PayloadType,
			currentOrganization.guid,
			currentOrganizationalUnit?.guid ?? null,
			env.PUBLIC_KC_REALM
		);
		const isPartOfOptions = await locals.pool.connect(
			maybePartOf(
				emptyContainer.organizational_unit ?? emptyContainer.organization,
				emptyContainer.payload.type
			)
		);
		overlayData = {
			isPartOfOptions: filterVisible(isPartOfOptions, locals.user),
			relatedContainers: [],
			revisions: [emptyContainer] as AnyContainer[]
		};
	}

	return { containers: filterVisible(containers, locals.user), overlayData, relationOverlayData };
}) satisfies PageServerLoad;
