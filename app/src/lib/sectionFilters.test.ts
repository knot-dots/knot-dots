import { expect, test } from 'vitest';
import { z } from 'zod';
import { type AnyPayload, type Container, container, payloadTypes } from '$lib/models';
import {
	hasActiveItemFilters,
	itemFiltersFromParams,
	matchesItemFilters,
	sectionGroupOf,
	sectionGroups
} from '$lib/sectionFilters';

const organization = '1d048b81-780a-41ad-813e-5111a23099fb';

const testContainer = container.extend({
	organizational_unit: z.uuid().nullable().default(null),
	realm: z.string().default(''),
	revision: z.number().default(0),
	valid_currently: z.boolean().default(true),
	valid_from: z.date().default(new Date())
});

function goal(payload: Record<string, unknown>) {
	return testContainer.parse({
		guid: 'a94a926f-d156-45d2-961f-f55f5bcdb004',
		managed_by: organization,
		organization,
		payload: { type: payloadTypes.enum.goal, title: 'Goal', ...payload }
	}) as Container<AnyPayload>;
}

test('object types map onto the section filter groups', () => {
	expect(sectionGroupOf(payloadTypes.enum.goal)).toBe(sectionGroups.enum.goals);
	expect(sectionGroupOf(payloadTypes.enum.measure)).toBe(sectionGroups.enum.measures);
	expect(sectionGroupOf(payloadTypes.enum.simple_measure)).toBe(sectionGroups.enum.measures);
	expect(sectionGroupOf(payloadTypes.enum.rule)).toBe(sectionGroups.enum.rules);
	expect(sectionGroupOf(payloadTypes.enum.knowledge)).toBe(sectionGroups.enum.knowledge);
});

test('item filters are read from the url params', () => {
	const params = new URLSearchParams('status=status.in_implementation&topic=mobility&terms=+Rad+');
	const filters = itemFiltersFromParams(params, ['topic', 'audience']);

	expect(filters).toEqual({
		categories: { topic: ['mobility'] },
		statuses: ['status.in_implementation'],
		terms: 'Rad'
	});
	expect(hasActiveItemFilters(filters)).toBe(true);
	expect(hasActiveItemFilters(itemFiltersFromParams(new URLSearchParams(), ['topic']))).toBe(false);
});

test('items match on status, categories and terms', () => {
	const item = goal({
		category: { topic: ['mobility', 'climate'] },
		description: 'Mehr Radwege bauen',
		status: 'status.in_implementation'
	});

	expect(
		matchesItemFilters(item, { categories: {}, statuses: ['status.in_implementation'], terms: '' })
	).toBe(true);
	expect(matchesItemFilters(item, { categories: {}, statuses: ['status.done'], terms: '' })).toBe(
		false
	);
	expect(
		matchesItemFilters(item, { categories: { topic: ['climate'] }, statuses: [], terms: '' })
	).toBe(true);
	expect(
		matchesItemFilters(item, { categories: { topic: ['housing'] }, statuses: [], terms: '' })
	).toBe(false);
	expect(matchesItemFilters(item, { categories: {}, statuses: [], terms: 'radwege' })).toBe(true);
	expect(matchesItemFilters(item, { categories: {}, statuses: [], terms: 'Schule' })).toBe(false);
	expect(matchesItemFilters(item, { categories: {}, statuses: [], terms: 'bauen Goal' })).toBe(
		true
	);
});
