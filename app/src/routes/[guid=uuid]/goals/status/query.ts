import type { ContainerGroup } from '$lib/containerGroups';
import { type Status, payloadTypes, predicates } from '$lib/models';

export const DEFAULT_RELATION_TYPES = [
	predicates.enum['is-consistent-with'],
	predicates.enum['is-equivalent-to'],
	predicates.enum['is-inconsistent-with'],
	predicates.enum['is-part-of']
];

export function createGoalStatusQuery(url: URL) {
	const query = new URLSearchParams(url.searchParams);
	query.delete('payloadType');
	query.delete('type');
	query.delete('status');
	query.append('type', payloadTypes.enum.goal);
	query.append('excludeRelation', predicates.enum['is-part-of-measure']);

	if (url.searchParams.has('related-to') && !url.searchParams.has('relationType')) {
		for (const relationType of DEFAULT_RELATION_TYPES) {
			query.append('relationType', relationType);
		}
	}

	return query;
}

export function goalStatusColumnGroup(status: Status): ContainerGroup {
	return { status: [status] };
}
