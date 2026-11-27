import type { ContainerGroup } from '$lib/containerGroups';
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

export function createAllLevelQuery(url: URL) {
	const query = new URLSearchParams(url.searchParams);
	query.delete('payloadType');
	query.delete('type');
	query.delete('hierarchyLevel');
	appendTypes(query, selectedTypeFilter(url));

	if (url.searchParams.has('related-to') && !url.searchParams.has('relationType')) {
		for (const relationType of DEFAULT_RELATION_TYPES) {
			query.append('relationType', relationType);
		}
	}

	query.set('template', 'false');

	return query;
}

export function allLevelColumnGroup(columnId: AllLevelColumnId): ContainerGroup {
	if (columnId === 'programs') {
		return { type: [payloadTypes.enum.program, payloadTypes.enum.report] };
	}
	if (columnId.startsWith('goals-')) {
		return {
			excludeRelation: [predicates.enum['is-part-of-measure']],
			hierarchyLevel: [Number(columnId.substring('goals-'.length))],
			type: [payloadTypes.enum.goal]
		};
	}
	const hierarchyLevel = Number(columnId.substring('implementation-'.length));
	return {
		hierarchyLevel: [hierarchyLevel],
		type:
			hierarchyLevel === 1
				? [payloadTypes.enum.measure, payloadTypes.enum.simple_measure, payloadTypes.enum.rule]
				: [payloadTypes.enum.measure, payloadTypes.enum.simple_measure]
	};
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

function appendTypes(query: URLSearchParams, types: string[]) {
	if (types.length === 0) {
		// Append a dummy guid to ensure the query returns no results, since an empty type filter means "all types".
		query.append('guid', '00000000-0000-0000-0000-000000000000');
		return;
	}
	for (const type of types) {
		query.append('type', type);
	}
}
