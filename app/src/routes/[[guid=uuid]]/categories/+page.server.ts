import { filterVisible } from '$lib/authorization';
import { payloadTypes } from '$lib/models';
import { getManyContainers } from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load = (async ({ locals, parent, url }) => {
	const { currentOrganization, defaultOrganizationGuid } = await parent();

	const organizationScope = currentOrganization.payload.default
		? []
		: Array.from(
			new Set(
				[currentOrganization.guid, defaultOrganizationGuid].filter(
					(guid): guid is string => Boolean(guid)
				)
			)
		);

	const containers = await locals.pool.connect(
		getManyContainers(
			organizationScope,
			{
				terms: url.searchParams.get('terms') ?? '',
				type: [payloadTypes.enum.category]
			},
			url.searchParams.get('sort') ?? 'alpha'
		)
	);

	return {
		containers: filterVisible(containers, locals.user)
	};
}) satisfies PageServerLoad;
