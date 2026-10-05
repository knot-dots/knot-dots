import { z } from 'zod';
import {
	type AnyPayload,
	type Container,
	type ObjectCollectionObjectType,
	payloadTypes
} from '$lib/models';

// The section filter of a program groups object sections by the kind of object
// they hold; every other section counts as "other".
export const sectionGroups = z.enum(['goals', 'measures', 'rules', 'knowledge', 'other']);

export type SectionGroup = z.infer<typeof sectionGroups>;

export function sectionGroupOf(objectType: ObjectCollectionObjectType): SectionGroup {
	switch (objectType) {
		case payloadTypes.enum.goal:
			return sectionGroups.enum.goals;
		case payloadTypes.enum.measure:
		case payloadTypes.enum.simple_measure:
			return sectionGroups.enum.measures;
		case payloadTypes.enum.rule:
			return sectionGroups.enum.rules;
		case payloadTypes.enum.knowledge:
			return sectionGroups.enum.knowledge;
	}
}

export type ItemFilters = {
	categories: Record<string, string[]>;
	statuses: string[];
	terms: string;
};

export function itemFiltersFromParams(
	params: URLSearchParams,
	categoryKeys: string[]
): ItemFilters {
	return {
		categories: Object.fromEntries(
			categoryKeys
				.map((key) => [key, params.getAll(key)] as const)
				.filter(([, values]) => values.length > 0)
		),
		statuses: params.getAll('status'),
		terms: params.get('terms')?.trim() ?? ''
	};
}

export function hasActiveItemFilters({ categories, statuses, terms }: ItemFilters) {
	return Object.keys(categories).length > 0 || statuses.length > 0 || terms !== '';
}

export function matchesItemFilters(
	container: Container<AnyPayload>,
	{ categories, statuses, terms }: ItemFilters
) {
	const { payload } = container;

	if (statuses.length > 0 && (!('status' in payload) || !statuses.includes(payload.status))) {
		return false;
	}

	for (const [key, values] of Object.entries(categories)) {
		const assigned = 'category' in payload ? (payload.category[key] ?? []) : [];
		if (!values.some((value) => assigned.includes(value))) {
			return false;
		}
	}

	if (terms !== '') {
		const needle = terms.toLowerCase();
		const haystack = [
			'title' in payload ? payload.title : '',
			'name' in payload ? payload.name : '',
			'summary' in payload ? (payload.summary ?? '') : '',
			'description' in payload ? (payload.description ?? '') : ''
		]
			.join('\n')
			.toLowerCase();
		if (!haystack.includes(needle)) {
			return false;
		}
	}

	return true;
}
