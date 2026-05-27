import { type RuleStatus, payloadTypes, predicates } from '$lib/models';

export const DEFAULT_RELATION_TYPES = [predicates.enum['is-inconsistent-with']] as string[];

export function createRuleStatusQuery(url: URL, status?: RuleStatus) {
	const query = new URLSearchParams(url.searchParams);
	query.delete('payloadType');
	query.delete('type');
	query.delete('ruleStatus');
	query.append('type', payloadTypes.enum.rule);

	if (status) {
		query.append('ruleStatus', status);
	}

	if (url.searchParams.has('related-to') && !url.searchParams.has('relationType')) {
		for (const relationType of DEFAULT_RELATION_TYPES) {
			query.append('relationType', relationType);
		}
	}

	return query;
}
