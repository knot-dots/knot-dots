import { filterVisible } from '$lib/authorization';
import { payloadTypes } from '$lib/models';
import { getManyContainers } from '$lib/server/db';
import type { PageServerLoad } from '../../routes/[guid=uuid]/help/$types';

export default (async function load({ depends, locals, parent, url }) {
	depends('containers');

	const { currentOrganization } = await parent();

	const containers = await locals.pool.connect(
		getManyContainers(
			currentOrganization.payload.default ? [] : [currentOrganization.guid],
			{
				terms: url.searchParams.get('terms') ?? '',
				type: [payloadTypes.enum.help]
			},
			url.searchParams.get('sort') ?? ''
		)
	);

	const filtered = filterVisible(containers, locals.user);

	return {
		containers: filtered
	};
} satisfies PageServerLoad);
