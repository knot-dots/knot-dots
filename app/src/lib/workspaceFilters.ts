import { payloadTypes, predicates, workspaceSort, type PayloadType } from '$lib/models';

export type WorkspaceFilters = {
	audience: string[];
	category: string[];
	indicatorCategory: string[];
	indicatorType: string[];
	measureType: string[];
	payloadType: PayloadType[];
	policyFieldBNK: string[];
	programType: string[];
	relationType: string[];
	relatedTo?: string;
	sort: typeof workspaceSort.enum[keyof typeof workspaceSort.enum];
	terms: string;
	topic: string[];
};

export function filtersFromUrl(url: URL): WorkspaceFilters {
	const params = url.searchParams;

	return {
		audience: params.getAll('audience'),
		category: params.getAll('category'),
		indicatorCategory: params.getAll('indicatorCategory'),
		indicatorType: params.getAll('indicatorType'),
		measureType: params.getAll('measureType'),
		payloadType: (params.getAll('payloadType') as PayloadType[]).filter(Boolean),
		policyFieldBNK: params.getAll('policyFieldBNK'),
		programType: params.getAll('programType'),
		relationType: params.getAll('relationType').filter((r) => predicates.options.includes(r as any)),
		relatedTo: params.get('related-to') ?? undefined,
		sort: (params.get('sort') as WorkspaceFilters['sort']) ?? workspaceSort.enum.alpha,
		terms: params.get('terms') ?? '',
		topic: params.getAll('topic')
	};
}

export function filtersToQuery(filters: WorkspaceFilters): URLSearchParams {
	const query = new URLSearchParams();

	for (const key of ['audience','category','indicatorCategory','indicatorType','measureType','policyFieldBNK','programType','topic'] as const) {
		filters[key].forEach((value) => query.append(key, value));
	}

	filters.payloadType.forEach((value) => query.append('payloadType', value));
	filters.relationType.forEach((value) => query.append('relationType', value));
	if (filters.relatedTo) query.append('related-to', filters.relatedTo);
	if (filters.sort && filters.sort !== workspaceSort.enum.alpha) query.append('sort', filters.sort);
	if (filters.terms) query.append('terms', filters.terms);

	return query;
}
