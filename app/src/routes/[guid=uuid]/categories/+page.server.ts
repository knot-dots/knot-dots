import { error } from '@sveltejs/kit';
import { _, unwrapFunctionStore } from 'svelte-i18n';
import { filterVisible } from '$lib/authorization';
import { type CategoryPayload, type Container, payloadTypes, type TermPayload } from '$lib/models';
import { getManyContainers } from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, parent, url }) => {
	if (!locals.user.isAuthenticated) {
		error(401, { message: unwrapFunctionStore(_)('error.unauthorized') });
	}

	const { currentOrganization, defaultOrganizationGuid } = await parent();

	const containers = (await locals.pool.connect(
		getManyContainers(
			[currentOrganization.guid, defaultOrganizationGuid],
			{
				terms: url.searchParams.get('terms') ?? '',
				type: [payloadTypes.enum.category, payloadTypes.enum.term]
			},
			url.searchParams.get('sort') ?? 'alpha'
		)
	)) as Array<Container<CategoryPayload | TermPayload>>;

	return {
		containers: filterVisible(containers, locals.user),
		title: unwrapFunctionStore(_)('workspace.categories.title')
	};
};
