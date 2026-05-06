import fetchContainerPage from '$lib/client/fetchContainerPage';
import { type AnyContainer, payloadTypes, predicates } from '$lib/models';
import { DEFAULT_PAGE_SIZE } from '$lib/pagination';
import type { PageServerLoad } from '../../routes/[guid=uuid]/all/$types';

const DEFAULT_RELATION_TYPES = [
	predicates.enum['contributes-to'],
	predicates.enum['is-consistent-with'],
	predicates.enum['is-equivalent-to'],
	predicates.enum['is-inconsistent-with'],
	predicates.enum['is-part-of']
];

export default (async function load({ depends, fetch, params, url }) {
	depends('containers');

	const allTypeOptions = [
		payloadTypes.enum.goal,
		payloadTypes.enum.help,
		payloadTypes.enum.knowledge,
		payloadTypes.enum.measure,
		payloadTypes.enum.organizational_unit,
		payloadTypes.enum.page,
		payloadTypes.enum.program,
		payloadTypes.enum.report,
		payloadTypes.enum.rule,
		payloadTypes.enum.simple_measure,
		payloadTypes.enum.task
	];
	const typeFilterFromURL = url.searchParams.getAll('type');
	const typeFilter = allTypeOptions.filter(
		(type) => typeFilterFromURL.length === 0 || typeFilterFromURL.includes(type)
	);

	const query = new URLSearchParams(url.searchParams);
	query.delete('type');
	for (const t of typeFilter) query.append('type', t);

	if (url.searchParams.has('related-to') && !url.searchParams.has('relationType')) {
		for (const rt of DEFAULT_RELATION_TYPES) query.append('relationType', rt);
	}

	return await fetchContainerPage<AnyContainer>({
		contextGuid: params.guid,
		fetch,
		limit: DEFAULT_PAGE_SIZE,
		offset: 0,
		query
	});
} satisfies PageServerLoad);
