import { z } from 'zod';
import { anyContainer } from '$lib/models';
import type { PayloadType } from '$lib/models';

export default async function fetchContainers(
	filters: {
		assignee?: string[];
		audience?: string[];
		category?: string[];
		indicatorCategory?: string[];
		indicatorType?: string[];
		isPartOfMeasure?: string[];
		isPartOfStrategy?: string[];
		measureType?: string[];
		organization?: string[];
		organizationalUnit?: string[];
		payloadType?: PayloadType[];
		policyFieldBNK?: string[];
		relatedTo?: string[];
		relationType?: string[];
		strategyType?: string[];
		taskCategory?: string[];
		terms?: string;
		topic?: string[];
	},
	sort?: string
) {
	const params = new URLSearchParams();
	for (const value of filters.assignee ?? []) {
		params.append('assignee', value);
	}
	for (const value of filters.audience ?? []) {
		params.append('audience', value);
	}
	for (const value of filters.category ?? []) {
		params.append('category', value);
	}
	for (const value of filters.indicatorCategory ?? []) {
		params.append('indicatorCategory', value);
	}
	for (const value of filters.indicatorType ?? []) {
		params.append('indicatorType', value);
	}
	for (const value of filters.isPartOfMeasure ?? []) {
		params.append('isPartOfMeasure', String(value));
	}
	for (const value of filters.isPartOfStrategy ?? []) {
		params.append('isPartOfStrategy', String(value));
	}
	for (const value of filters.measureType ?? []) {
		params.append('measureType', String(value));
	}
	for (const value of filters.organization ?? []) {
		params.append('organization', value);
	}
	for (const value of filters.organizationalUnit ?? []) {
		params.append('organizationalUnit', value);
	}
	for (const value of filters.payloadType ?? []) {
		params.append('payloadType', value);
	}
	for (const value of filters.policyFieldBNK ?? []) {
		params.append('policyFieldBNK', value);
	}
	for (const value of filters.relatedTo ?? []) {
		params.append('relatedTo', value);
	}
	for (const value of filters.relationType ?? []) {
		params.append('relationType', value);
	}
	if (sort) {
		params.append('sort', sort);
	}
	for (const value of filters.strategyType ?? []) {
		params.append('strategyType', value);
	}
	for (const value of filters.taskCategory ?? []) {
		params.append('taskCategory', value);
	}
	if (filters.terms) {
		params.append('terms', filters.terms);
	}
	for (const value of filters.topic ?? []) {
		params.append('topic', value);
	}
	const response = await fetch(`/container?${params}`);
	const data = await response.json();
	return z.array(anyContainer).parse(data);
}
