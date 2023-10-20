import { error } from '@sveltejs/kit';
import { _, unwrapFunctionStore } from 'svelte-i18n';
import { env } from '$env/dynamic/public';
import { filterVisible } from '$lib/authorization';
import { containerOfType, isOrganizationalUnitContainer, payloadTypes } from '$lib/models';
import type { AnyContainer, EmptyOrganizationalUnitContainer } from '$lib/models';
import {
	getAllRelatedOrganizationalUnitContainers,
	getContainerByGuid,
	maybePartOf
} from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load = (async ({ locals, url, params }) => {
	let containers;
	let overlayData;

	const container = await locals.pool.connect(getContainerByGuid(params.guid));

	if (!isOrganizationalUnitContainer(container)) {
		throw error(404, unwrapFunctionStore(_)('error.not_found'));
	}

	if (url.searchParams.has('related-to')) {
		containers = await locals.pool.connect(
			getAllRelatedOrganizationalUnitContainers(url.searchParams.get('related-to') as string)
		);
	} else {
		containers = await locals.pool.connect(
			getAllRelatedOrganizationalUnitContainers(container.guid)
		);
	}

	if (url.searchParams.has('overlay-new')) {
		const newContainer = containerOfType(
			payloadTypes.enum.organizational_unit,
			container.organization,
			null,
			env.PUBLIC_KC_REALM
		) as EmptyOrganizationalUnitContainer;
		newContainer.payload.level = parseInt(url.searchParams.get('level') ?? '1');
		const isPartOfOptions = await locals.pool.connect(
			maybePartOf(container.organization, payloadTypes.enum.organizational_unit)
		);
		overlayData = {
			isPartOfOptions,
			relatedContainers: [],
			revisions: [newContainer] as AnyContainer[]
		};
	}

	return { container, containers: filterVisible(containers, locals.user), overlayData };
}) satisfies PageServerLoad;
