import { z } from 'zod';
import {
	type AnyPayload,
	type Container,
	levels,
	payloadTypes,
	predicates,
	status
} from '$lib/models';

// A group narrows the result of a container query to a subset, such as a
// column of a board. Its fields are restricted to those that can be checked
// against a container without querying the database.
const containerGroupFields = z.strictObject({
	excludeRelation: z.array(predicates).optional(),
	hierarchyLevel: z.array(z.coerce.number<string>().int().gte(1).lte(6)).optional(),
	level: z.array(levels).optional(),
	status: z.array(status).optional(),
	type: z.array(payloadTypes).optional()
});

export type ContainerGroup = z.infer<typeof containerGroupFields>;

// Groups are passed as query parameters in the form field:value|value,field:value,
// e.g. group=type:goal,hierarchyLevel:1,excludeRelation:is-part-of-measure.
export const containerGroup = z
	.string()
	.transform((value) =>
		value === ''
			? {}
			: Object.fromEntries(
					value.split(',').map((part) => {
						const [field, values = ''] = part.split(':', 2);
						return [field, values.split('|')];
					})
				)
	)
	.pipe(containerGroupFields);

export function formatContainerGroup(group: ContainerGroup) {
	return Object.entries(group)
		.filter(([, values]) => values && values.length > 0)
		.map(([field, values]) => `${field}:${values.join('|')}`)
		.join(',');
}

type GroupedContainer = Pick<Container<AnyPayload>, 'guid' | 'relation'> & {
	payload: Pick<AnyPayload, 'type'>;
};

export function matchesContainerGroup(container: GroupedContainer, group: ContainerGroup) {
	const payload: Record<string, unknown> = container.payload;

	return (
		(!group.type?.length || group.type.includes(container.payload.type)) &&
		// Containers without a hierarchy level are on the first level.
		(!group.hierarchyLevel?.length ||
			group.hierarchyLevel.some((level) => level === (payload.hierarchyLevel ?? 1))) &&
		(!group.level?.length || group.level.some((level) => level === payload.level)) &&
		(!group.status?.length || group.status.some((value) => value === payload.status)) &&
		(!group.excludeRelation?.length ||
			!container.relation.some(
				({ predicate, subject }) =>
					subject === container.guid &&
					group.excludeRelation?.some((excluded) => excluded === predicate)
			))
	);
}

// Returns the query for loading further pages of a group from GET /container/v2,
// or undefined if no container can match both the query and the group.
export function containerGroupQuery(query: URLSearchParams, group: ContainerGroup) {
	const groupQuery = new URLSearchParams(query);

	if (!groupQuery.has('type') && groupQuery.has('payloadType')) {
		for (const type of groupQuery.getAll('payloadType')) {
			groupQuery.append('type', type);
		}
	}
	groupQuery.delete('payloadType');

	for (const field of ['hierarchyLevel', 'level', 'status', 'type'] as const) {
		const values = group[field]?.map(String);
		if (!values?.length) {
			continue;
		}

		const queriedValues = groupQuery.getAll(field);
		const intersection =
			queriedValues.length > 0 ? values.filter((value) => queriedValues.includes(value)) : values;
		if (intersection.length === 0) {
			return undefined;
		}

		groupQuery.delete(field);
		for (const value of intersection) {
			groupQuery.append(field, value);
		}
	}

	for (const predicate of group.excludeRelation ?? []) {
		groupQuery.append('excludeRelation', predicate);
	}

	// The facets of a board are those of all its groups, which are loaded with the first pages.
	groupQuery.set('facets', 'false');

	return groupQuery;
}
