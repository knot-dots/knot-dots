import { type Level, payloadTypes, predicates } from '$lib/models';

export const DEFAULT_RELATION_TYPES = [
	predicates.enum['is-consistent-with'],
	predicates.enum['is-equivalent-to'],
	predicates.enum['is-inconsistent-with'],
	predicates.enum['is-superordinate-of']
];

export function createProgramLevelQuery(url: URL, level?: Level) {
	const query = new URLSearchParams(url.searchParams);
	query.delete('payloadType');
	query.delete('type');
	query.delete('level');
	query.append('type', payloadTypes.enum.program);

	if (level) {
		query.append('level', level);
	}

	if (url.searchParams.has('related-to') && !url.searchParams.has('relationType')) {
		for (const relationType of DEFAULT_RELATION_TYPES) {
			query.append('relationType', relationType);
		}
	}

	return query;
}
