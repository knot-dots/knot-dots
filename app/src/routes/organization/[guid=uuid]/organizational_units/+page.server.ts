import { error } from '@sveltejs/kit';
import { _, unwrapFunctionStore } from 'svelte-i18n';
import { filterVisible } from '$lib/authorization';
import { isOrganizationContainer } from '$lib/models';
import {
	getAllRelatedOrganizationalUnitContainers,
	getContainerByGuid,
	getManyOrganizationalUnitContainers
} from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load = (async ({ locals, url, params }) => {
	let containers;
	const container = await locals.pool.connect(getContainerByGuid(params.guid));

	if (!isOrganizationContainer(container)) {
		error(404, { message: unwrapFunctionStore(_)('error.not_found') });
	}

	if (url.searchParams.has('related-to')) {
		containers = await locals.pool.connect(
			getAllRelatedOrganizationalUnitContainers(url.searchParams.get('related-to') as string)
		);
	} else {
		containers = await locals.pool.connect(
			getManyOrganizationalUnitContainers({ organization: container.guid })
		);
	}

	return { container, containers: filterVisible(containers, locals.user) };
}) satisfies PageServerLoad;
