import { error } from '@sveltejs/kit';
import { _, unwrapFunctionStore } from 'svelte-i18n';
import { filterVisible } from '$lib/authorization';
import { isOrganizationalUnitContainer } from '$lib/models';
import { getAllRelatedOrganizationalUnitContainers, getContainerByGuid } from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load = (async ({ locals, url, params }) => {
	const container = await locals.pool.connect(getContainerByGuid(params.guid));
	let containers;

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

	return { container, containers: filterVisible(containers, locals.user) };
}) satisfies PageServerLoad;
