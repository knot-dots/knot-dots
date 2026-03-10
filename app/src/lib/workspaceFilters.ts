import {
	isOverlayKey,
	predicates,
	workspaceSort,
	workspaceView,
	type PayloadType,
	type Predicate
} from '$lib/models';

export type WorkspaceFilters = {
	audience: string[];
	sdg: string[];
	category: Record<string, string[]>;
	indicatorCategory: string[];
	indicatorType: string[];
	measureType: string[];
	payloadType: PayloadType[];
	policyFieldBNK: string[];
	programType: string[];
	taskCategory: string[];
	relationType: string[];
	relatedTo?: string;
	sort: (typeof workspaceSort.enum)[keyof typeof workspaceSort.enum];
	terms: string;
	topic: string[];
	view: (typeof workspaceView.enum)[keyof typeof workspaceView.enum];
};

const predicateValues = predicates.options as readonly string[];

function isPredicate(value: string): value is Predicate {
	return predicateValues.includes(value);
}

function viewFromUrl(url: URL): WorkspaceFilters['view'] {
	const segments = url.pathname.split('/').filter(Boolean);
	const last = segments[segments.length - 1];
	const viewOptions = workspaceView.options as WorkspaceFilters['view'][];
	return viewOptions.includes(last as WorkspaceFilters['view'])
		? (last as WorkspaceFilters['view'])
		: workspaceView.enum.catalog;
}

export function filtersFromUrl(url: URL, customCategoryKeys: string[] = []): WorkspaceFilters {
	const params = url.searchParams;
	const customKeys = new Set(customCategoryKeys);
	const sdg = customKeys.has('sdg') ? [] : params.getAll('sdg');
	const legacyCategory = params.getAll('category');
	const category: Record<string, string[]> = {};
	for (const key of customCategoryKeys) {
		const values = params.getAll(key).filter((value) => value !== '');
		if (values.length) {
			category[key] = values;
		}
	}

	const getAll = (key: string) => (customKeys.has(key) ? [] : params.getAll(key));

	return {
		audience: getAll('audience'),
		sdg: sdg.length ? sdg : legacyCategory,
		category,
		indicatorCategory: getAll('indicatorCategory'),
		indicatorType: getAll('indicatorType'),
		measureType: getAll('measureType'),
		payloadType: (params.getAll('payloadType') as PayloadType[]).filter(Boolean),
		policyFieldBNK: getAll('policyFieldBNK'),
		programType: getAll('programType'),
		taskCategory: getAll('taskCategory'),
		relationType: params.getAll('relationType').filter(isPredicate),
		relatedTo: params.get('related-to') ?? undefined,
		sort: (params.get('sort') as WorkspaceFilters['sort']) ?? workspaceSort.enum.alpha,
		terms: params.get('terms') ?? '',
		topic: getAll('topic'),
		view: (params.get('view') as WorkspaceFilters['view']) ?? viewFromUrl(url)
	};
}

export function filtersFromWorkspaceOverlay(
	savedFilters: Record<string, unknown>,
	hashParams: URLSearchParams,
	customCategoryKeys: string[] = []
): WorkspaceFilters {
	const merged = new URLSearchParams();

	const overriddenKeys = new Set<string>();
	for (const key of hashParams.keys()) {
		if (key.endsWith('Changed')) {
			overriddenKeys.add(key.slice(0, -'Changed'.length));
		} else if (!isOverlayKey(key) && key !== 'fullscreen') {
			overriddenKeys.add(key);
		}
	}

	for (const [key, value] of hashParams.entries()) {
		if (!isOverlayKey(key) && key !== 'fullscreen' && !key.endsWith('Changed')) {
			merged.append(key, value);
		}
	}

	for (const [key, value] of Object.entries(savedFilters)) {
		const urlKey = key === 'relatedTo' ? 'related-to' : key;

		if (key === 'category' && typeof value === 'object' && !Array.isArray(value) && value) {
			for (const [catKey, catValues] of Object.entries(value as Record<string, string[]>)) {
				if (overriddenKeys.has(catKey)) continue;
				if (Array.isArray(catValues)) {
					catValues.forEach((v) => merged.append(catKey, String(v)));
				}
			}
			continue;
		}

		if (overriddenKeys.has(urlKey)) continue;

		if (Array.isArray(value)) {
			value.forEach((v) => {
				if (v !== undefined && v !== null && String(v) !== '') {
					merged.append(urlKey, String(v));
				}
			});
		} else if (typeof value === 'string' && value) {
			merged.set(urlKey, value);
		}
	}

	return filtersFromUrl(new URL(`http://x?${merged.toString()}`), customCategoryKeys);
}

export function filtersToQuery(filters: WorkspaceFilters): URLSearchParams {
	const query = new URLSearchParams();

	for (const key of [
		'audience',
		'sdg',
		'indicatorCategory',
		'indicatorType',
		'measureType',
		'policyFieldBNK',
		'programType',
		'taskCategory',
		'topic'
	] as const) {
		filters[key].forEach((value) => query.append(key, value));
	}

	for (const [key, values] of Object.entries(filters.category)) {
		values.forEach((value) => query.append(key, value));
	}

	filters.payloadType.forEach((value) => query.append('payloadType', value));
	filters.relationType.forEach((value) => query.append('relationType', value));
	if (filters.relatedTo) query.append('related-to', filters.relatedTo);
	if (filters.sort && filters.sort !== workspaceSort.enum.alpha) query.append('sort', filters.sort);
	if (filters.terms) query.append('terms', filters.terms);
	if (filters.view && filters.view !== workspaceView.enum.catalog)
		query.append('view', filters.view);

	return query;
}
