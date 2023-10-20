import { env } from '$env/dynamic/public';
import { filterVisible } from '$lib/authorization';
import { containerOfType, payloadTypes } from '$lib/models';
import type { AnyContainer } from '$lib/models';
import { getManyOrganizationContainers } from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load = (async ({ locals, url }) => {
	let overlayData;

	const containers = await locals.pool.connect(
		getManyOrganizationContainers(
			{ default: false, organizationCategories: url.searchParams.getAll('organizationCategory') },
			url.searchParams.get('sort') ?? ''
		)
	);

	if (url.searchParams.has('overlay-new')) {
		const newContainer = containerOfType(
			payloadTypes.enum.organization,
			'00000000-0000-0000-0000-000000000000',
			null,
			env.PUBLIC_KC_REALM
		);
		overlayData = {
			isPartOfOptions: [],
			relatedContainers: [],
			revisions: [newContainer] as AnyContainer[]
		};
	}

	return { containers: filterVisible(containers, locals.user), overlayData };
}) satisfies PageServerLoad;
