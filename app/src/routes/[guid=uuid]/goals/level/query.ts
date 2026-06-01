import { payloadTypes, predicates } from '$lib/models';

export const DEFAULT_RELATION_TYPES = [
	predicates.enum['is-consistent-with'],
	predicates.enum['is-equivalent-to'],
	predicates.enum['is-inconsistent-with'],
	predicates.enum['is-part-of']
];

export function createGoalLevelQuery(url: URL, hierarchyLevel?: string) {
	const query = new URLSearchParams(url.searchParams);
	query.delete('payloadType');
	query.delete('type');
	query.delete('hierarchyLevel');
	query.append('type', payloadTypes.enum.goal);
	query.append('excludeRelation', predicates.enum['is-part-of-measure']);

	if (hierarchyLevel) {
		query.append('hierarchyLevel', hierarchyLevel);
	}

	if (url.searchParams.has('related-to') && !url.searchParams.has('relationType')) {
		for (const relationType of DEFAULT_RELATION_TYPES) {
			query.append('relationType', relationType);
		}
	}

	return query;
}
