import type { ContainerGroup } from '$lib/containerGroups';
import { type Level, payloadTypes, predicates } from '$lib/models';

export const DEFAULT_RELATION_TYPES = [
	predicates.enum['is-consistent-with'],
	predicates.enum['is-equivalent-to'],
	predicates.enum['is-inconsistent-with'],
	predicates.enum['is-superordinate-of']
];

export function createProgramLevelQuery(url: URL) {
	const query = new URLSearchParams(url.searchParams);
	query.delete('payloadType');
	query.delete('type');
	query.delete('level');
	query.delete('organization');
	query.append('organization', 'ANY');
	query.append('type', payloadTypes.enum.program);

	if (url.searchParams.has('related-to') && !url.searchParams.has('relationType')) {
		for (const relationType of DEFAULT_RELATION_TYPES) {
			query.append('relationType', relationType);
		}
	}

	return query;
}

export function programLevelColumnGroup(level: Level): ContainerGroup {
	return { level: [level] };
}
