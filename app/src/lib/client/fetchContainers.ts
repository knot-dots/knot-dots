import { z } from 'zod';
import withRequestCoalescing from '$lib/client/withRequestCoalescing';
import { anyContainer, type PayloadType } from '$lib/models';

export default async function fetchContainers(
	filters: {
		assignee?: string[];
		audience?: string[];
		sdg?: string[];
		indicatorCategory?: string[];
		indicatorType?: string[];
		isPartOfMeasure?: string[];
		isPartOfProgram?: string[];
		organization?: string[];
		organizationalUnit?: string[];
		payloadType?: PayloadType[];
		policyFieldBNK?: string[];
		programType?: string[];
		relatedTo?: string[];
		relationType?: string[];
		taskCategory?: string[];
		terms?: string;
		topic?: string[];
	},
	sort?: string,
	init?: RequestInit
) {
	const params = new URLSearchParams();
	for (const value of filters.assignee ?? []) {
		params.append('assignee', value);
	}
	for (const value of filters.audience ?? []) {
		params.append('audience', value);
	}
	for (const value of filters.sdg ?? []) {
		params.append('sdg', value);
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
	for (const value of filters.isPartOfProgram ?? []) {
		params.append('isPartOfProgram', String(value));
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
	for (const value of filters.programType ?? []) {
		params.append('programType', value);
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
	const response = await withRequestCoalescing(fetch)(`/container?${params}`, init);
	return z.array(anyContainer).parse(await response.json());
}
