import fetchContainerPage from '$lib/client/fetchContainerPage';
import { type GoalContainer, payloadTypes, predicates } from '$lib/models';
import { DEFAULT_PAGE_SIZE } from '$lib/pagination';
import type { PageServerLoad } from '../../routes/[guid=uuid]/goals/$types';

const DEFAULT_RELATION_TYPES = [
	predicates.enum['is-consistent-with'],
	predicates.enum['is-equivalent-to'],
	predicates.enum['is-inconsistent-with'],
	predicates.enum['is-part-of']
];

export default (async function load({ depends, fetch, params, url }) {
	depends('containers');

	const query = new URLSearchParams([
		...url.searchParams,
		['type', payloadTypes.enum.goal],
		['excludeRelation', predicates.enum['is-part-of-measure']]
	]);

	if (url.searchParams.has('related-to') && !url.searchParams.has('relationType')) {
		for (const rt of DEFAULT_RELATION_TYPES) query.append('relationType', rt);
	}

	return await fetchContainerPage<GoalContainer>({
		contextGuid: params.guid,
		fetch,
		limit: DEFAULT_PAGE_SIZE,
		offset: 0,
		query
	});
} satisfies PageServerLoad);
