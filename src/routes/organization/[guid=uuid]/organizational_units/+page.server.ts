import { env } from '$env/dynamic/public';
import { filterVisible } from '$lib/authorization';
import { containerOfType, payloadTypes } from '$lib/models';
import type { AnyContainer, EmptyOrganizationalUnitContainer } from '$lib/models';
import {
	getAllRelatedOrganizationalUnitContainers,
	getContainerByGuid,
	getManyOrganizationalUnitContainers,
	maybePartOf
} from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load = (async ({ locals, url, params }) => {
	let containers;
	let overlayData;

	const container = await locals.pool.connect(getContainerByGuid(params.guid));

	if (url.searchParams.has('related-to')) {
		containers = await locals.pool.connect(
			getAllRelatedOrganizationalUnitContainers(url.searchParams.get('related-to') as string)
		);
	} else {
		containers = await locals.pool.connect(
			getManyOrganizationalUnitContainers({ organization: container.guid })
		);
	}

	if (url.searchParams.has('overlay-new')) {
		const newContainer = containerOfType(
			payloadTypes.enum.organizational_unit,
			params.guid,
			null,
			env.PUBLIC_KC_REALM
		) as EmptyOrganizationalUnitContainer;
		newContainer.payload.level = parseInt(url.searchParams.get('level') ?? '1');
		const isPartOfOptions = await locals.pool.connect(
			maybePartOf(params.guid, payloadTypes.enum.organizational_unit)
		);
		overlayData = {
			isPartOfOptions,
			relatedContainers: [],
			revisions: [newContainer] as AnyContainer[]
		};
	}

	return { container, containers: filterVisible(containers, locals.user), overlayData };
}) satisfies PageServerLoad;
