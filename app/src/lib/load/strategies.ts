import fetchContainerPage from '$lib/client/fetchContainerPage';
import { type ProgramContainer, payloadTypes, predicates } from '$lib/models';
import { DEFAULT_PAGE_SIZE } from '$lib/pagination';
import { strategyProgramTypes } from '$lib/workspaces';
import type { PageServerLoad } from '../../routes/[guid=uuid]/strategies/$types';

const DEFAULT_RELATION_TYPES = [
	predicates.enum['is-consistent-with'],
	predicates.enum['is-equivalent-to'],
	predicates.enum['is-inconsistent-with'],
	predicates.enum['is-superordinate-of']
];

export const loadPage = (limit: number) =>
	(async ({ depends, fetch, params, url }) => {
		depends('containers');

		const query = new URLSearchParams([
			...url.searchParams,
			...strategyProgramTypes.map((t) => ['programType', t]),
			['type', payloadTypes.enum.program]
		]);

		if (url.searchParams.has('related-to') && !url.searchParams.has('relationType')) {
			for (const rt of DEFAULT_RELATION_TYPES) query.append('relationType', rt);
		}

		return await fetchContainerPage<ProgramContainer>({
			contextGuid: params.guid,
			fetch,
			limit,
			offset: 0,
			query
		});
	}) satisfies PageServerLoad;

export default loadPage(DEFAULT_PAGE_SIZE);
