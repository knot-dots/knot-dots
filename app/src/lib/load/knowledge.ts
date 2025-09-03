import { filterVisible } from '$lib/authorization';
import { payloadTypes, predicates } from '$lib/models';
import { getAllRelatedContainers, getManyContainers } from '$lib/server/db';
import type { PageServerLoad } from '../../routes/[guid=uuid]/knowledge/$types';

export default (async function load({ locals, url, parent }) {
	let containers;
	const { currentOrganization } = await parent();

	if (url.searchParams.has('related-to')) {
		containers = await locals.pool.connect(
			getAllRelatedContainers(
				currentOrganization.payload.default ? [] : [currentOrganization.guid],
				url.searchParams.get('related-to') as string,
				[predicates.enum['is-part-of']],
				{ type: [payloadTypes.enum.knowledge] },
				url.searchParams.get('sort') ?? ''
			)
		);
	} else {
		containers = await locals.pool.connect(
			getManyContainers(
				currentOrganization.payload.default ? [] : [currentOrganization.guid],
				{
					audience: url.searchParams.getAll('audience'),
					categories: url.searchParams.getAll('category'),
					policyFieldsBNK: url.searchParams.getAll('policyFieldBNK'),
					programTypes: url.searchParams.getAll('programType'),
					terms: url.searchParams.get('terms') ?? '',
					topics: url.searchParams.getAll('topic'),
					type: [payloadTypes.enum.knowledge]
				},
				url.searchParams.get('sort') ?? ''
			)
		);
	}

	return { containers: filterVisible(containers, locals.user) };
} satisfies PageServerLoad);
