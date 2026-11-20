import type { ContainerGroup } from '$lib/containerGroups';
import { type Status, payloadTypes, predicates } from '$lib/models';
import { strategyProgramTypes } from '$lib/workspaces';

export const DEFAULT_RELATION_TYPES = [
	predicates.enum['is-consistent-with'],
	predicates.enum['is-equivalent-to'],
	predicates.enum['is-inconsistent-with'],
	predicates.enum['is-superordinate-of']
];

export function createStrategyStatusQuery(url: URL) {
	const query = new URLSearchParams(url.searchParams);
	query.delete('payloadType');
	query.delete('type');
	query.delete('status');
	query.delete('programType');
	for (const programType of strategyProgramTypes) {
		query.append('programType', programType);
	}
	query.append('type', payloadTypes.enum.program);

	if (url.searchParams.has('related-to') && !url.searchParams.has('relationType')) {
		for (const relationType of DEFAULT_RELATION_TYPES) {
			query.append('relationType', relationType);
		}
	}

	return query;
}

export function strategyStatusColumnGroup(status: Status): ContainerGroup {
	return { status: [status] };
}
