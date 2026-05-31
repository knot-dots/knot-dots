import { payloadTypes, predicates } from '$lib/models';

export const DEFAULT_RELATION_TYPES = [
	predicates.enum['contributes-to'],
	predicates.enum['is-consistent-with'],
	predicates.enum['is-equivalent-to'],
	predicates.enum['is-inconsistent-with'],
	predicates.enum['is-part-of']
];

export const ALL_LEVEL_COLUMN_IDS = [
	'programs',
	'goals-1',
	'goals-2',
	'goals-3',
	'goals-4',
	'goals-5',
	'goals-6',
	'implementation-1',
	'implementation-2',
	'implementation-3',
	'implementation-4',
	'implementation-5',
	'implementation-6'
] as const;

export type AllLevelColumnId = (typeof ALL_LEVEL_COLUMN_IDS)[number];

export function createAllLevelQuery(url: URL, columnId?: AllLevelColumnId) {
	const query = new URLSearchParams(url.searchParams);
	query.delete('payloadType');
	query.delete('type');
	query.delete('hierarchyLevel');
	const selectedTypes = selectedTypeFilter(url);

	if (!columnId) {
		appendTypes(query, selectedTypes);
	} else if (columnId === 'programs') {
		appendTypes(query, selectedTypes, [payloadTypes.enum.program, payloadTypes.enum.report]);
	} else if (columnId.startsWith('goals-')) {
		appendTypes(query, selectedTypes, [payloadTypes.enum.goal]);
		query.append('excludeRelation', predicates.enum['is-part-of-measure']);
		query.append('hierarchyLevel', columnId.substring('goals-'.length));
	} else {
		const hierarchyLevel = columnId.substring('implementation-'.length);
		const types: string[] = [payloadTypes.enum.measure, payloadTypes.enum.simple_measure];
		if (hierarchyLevel === '1') {
			types.push(payloadTypes.enum.rule);
		}
		appendTypes(query, selectedTypes, types);
		query.append('hierarchyLevel', hierarchyLevel);
	}

	if (url.searchParams.has('related-to') && !url.searchParams.has('relationType')) {
		for (const relationType of DEFAULT_RELATION_TYPES) {
			query.append('relationType', relationType);
		}
	}

	return query;
}

function selectedTypeFilter(url: URL) {
	const allTypes = [
		payloadTypes.enum.goal,
		payloadTypes.enum.measure,
		payloadTypes.enum.program,
		payloadTypes.enum.report,
		payloadTypes.enum.rule,
		payloadTypes.enum.simple_measure
	];
	const urlTypes = [...url.searchParams.getAll('type'), ...url.searchParams.getAll('payloadType')];
	return allTypes.filter((type) => urlTypes.length === 0 || urlTypes.includes(type));
}

function appendTypes(query: URLSearchParams, selectedTypes: string[], columnTypes = selectedTypes) {
	const types = columnTypes.filter((type) => selectedTypes.includes(type));
	if (types.length === 0) {
		// Append a dummy guid to ensure the query returns no results, since an empty type filter means "all types".
		// Used for the facet request.
		query.append('guid', '00000000-0000-0000-0000-000000000000');
		return;
	}
	for (const type of types) {
		query.append('type', type);
	}
}
