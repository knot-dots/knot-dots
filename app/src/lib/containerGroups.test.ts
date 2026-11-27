import { describe, expect, test } from 'vitest';
import {
	containerGroup,
	containerGroupQuery,
	formatContainerGroup,
	matchesContainerGroup
} from '$lib/containerGroups';
import { type PayloadType, payloadTypes, predicates, type Relation } from '$lib/models';

const guid = '00000000-0000-4000-8000-000000000001';

function container(
	payload: { type: PayloadType } & Record<string, unknown>,
	relation: Relation[] = []
) {
	return { guid, payload, relation };
}

describe('containerGroup', () => {
	test('parses the fields of a group', () => {
		expect(
			containerGroup.parse(
				'type:measure|simple_measure,hierarchyLevel:2,excludeRelation:is-part-of-measure'
			)
		).toEqual({
			excludeRelation: [predicates.enum['is-part-of-measure']],
			hierarchyLevel: [2],
			type: [payloadTypes.enum.measure, payloadTypes.enum.simple_measure]
		});
	});

	test('parses an empty group', () => {
		expect(containerGroup.parse('')).toEqual({});
	});

	test('rejects unknown fields and values', () => {
		expect(containerGroup.safeParse('terms:climate').success).toBe(false);
		expect(containerGroup.safeParse('type:unknown').success).toBe(false);
		expect(containerGroup.safeParse('hierarchyLevel:7').success).toBe(false);
	});

	test('formats a group as it is parsed', () => {
		const group = {
			excludeRelation: [predicates.enum['is-part-of-measure']],
			hierarchyLevel: [1],
			type: [payloadTypes.enum.goal]
		};

		expect(containerGroup.parse(formatContainerGroup(group))).toEqual(group);
	});
});

describe('matchesContainerGroup', () => {
	test('matches the type', () => {
		const group = { type: [payloadTypes.enum.program, payloadTypes.enum.report] };

		expect(matchesContainerGroup(container({ type: payloadTypes.enum.report }), group)).toBe(true);
		expect(matchesContainerGroup(container({ type: payloadTypes.enum.goal }), group)).toBe(false);
	});

	test('treats containers without a hierarchy level as first level', () => {
		const rule = container({ type: payloadTypes.enum.rule });

		expect(matchesContainerGroup(rule, { hierarchyLevel: [1] })).toBe(true);
		expect(matchesContainerGroup(rule, { hierarchyLevel: [2] })).toBe(false);
		expect(
			matchesContainerGroup(container({ hierarchyLevel: 2, type: payloadTypes.enum.goal }), {
				hierarchyLevel: [2]
			})
		).toBe(true);
	});

	test('matches the status and level', () => {
		const measure = container({ status: 'status.idea', type: payloadTypes.enum.measure });
		const program = container({ level: 'level.local', type: payloadTypes.enum.program });

		expect(matchesContainerGroup(measure, { status: ['status.idea'] })).toBe(true);
		expect(matchesContainerGroup(measure, { status: ['status.done'] })).toBe(false);
		expect(matchesContainerGroup(program, { level: ['level.local'] })).toBe(true);
		expect(matchesContainerGroup(program, { level: ['level.regional'] })).toBe(false);
	});

	test('excludes containers that are the subject of an excluded relation', () => {
		const group = { excludeRelation: [predicates.enum['is-part-of-measure']] };
		const other = '00000000-0000-4000-8000-000000000002';

		expect(
			matchesContainerGroup(
				container({ type: payloadTypes.enum.goal }, [
					{ object: other, position: 0, predicate: 'is-part-of-measure', subject: guid }
				]),
				group
			)
		).toBe(false);
		expect(
			matchesContainerGroup(
				container({ type: payloadTypes.enum.goal }, [
					{ object: guid, position: 0, predicate: 'is-part-of-measure', subject: other }
				]),
				group
			)
		).toBe(true);
	});
});

describe('containerGroupQuery', () => {
	test('narrows the query to the values of the group', () => {
		const query = new URLSearchParams([
			['type', payloadTypes.enum.goal],
			['type', payloadTypes.enum.measure],
			['status', 'status.idea']
		]);

		const groupQuery = containerGroupQuery(query, {
			hierarchyLevel: [2],
			type: [payloadTypes.enum.measure, payloadTypes.enum.simple_measure]
		});

		expect(groupQuery?.getAll('type')).toEqual([payloadTypes.enum.measure]);
		expect(groupQuery?.getAll('hierarchyLevel')).toEqual(['2']);
		expect(groupQuery?.getAll('status')).toEqual(['status.idea']);
		expect(groupQuery?.get('facets')).toBe('false');
	});

	test('narrows a query by payloadType as well', () => {
		const query = new URLSearchParams([['payloadType', payloadTypes.enum.goal]]);

		expect(
			containerGroupQuery(query, {
				type: [payloadTypes.enum.goal, payloadTypes.enum.measure]
			})?.getAll('type')
		).toEqual([payloadTypes.enum.goal]);
	});

	test('returns undefined if the group cannot match the query', () => {
		const query = new URLSearchParams([['type', payloadTypes.enum.goal]]);

		expect(containerGroupQuery(query, { type: [payloadTypes.enum.program] })).toBeUndefined();
	});

	test('adds excluded relations to those of the query', () => {
		const query = new URLSearchParams([['excludeRelation', predicates.enum['is-part-of-program']]]);

		expect(
			containerGroupQuery(query, {
				excludeRelation: [predicates.enum['is-part-of-measure']]
			})?.getAll('excludeRelation')
		).toEqual([predicates.enum['is-part-of-program'], predicates.enum['is-part-of-measure']]);
	});
});
