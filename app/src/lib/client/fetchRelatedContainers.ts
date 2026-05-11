import { z } from 'zod';
import { page } from '$app/state';
import { container } from '$lib/models';

export default async function fetchRelatedContainers(
	guid: string,
	filters: {
		[key: string]: string | string[] | undefined;
		assignee?: string[];
		organization?: string[];
		organizationalUnit?: string[];
		payloadType?: string[];
		relationType?: string[];
		program?: string[];
		programType?: string[];
		taskCategory?: string[];
		terms?: string;
	},
	sort?: string,
	init?: RequestInit
) {
	const params = new URLSearchParams();
	for (const key of page.data.categoryContext.keys) {
		for (const value of (filters[key] as string[]) ?? []) {
			params.append(key, value);
		}
	}
	for (const value of filters.assignee ?? []) {
		params.append('assignee', value);
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
	for (const value of filters.program ?? []) {
		params.append('program', value);
	}
	for (const value of filters.programType ?? []) {
		params.append('programType', value);
	}
	for (const value of filters.relationType ?? []) {
		params.append('relationType', value);
	}
	if (sort) {
		params.append('sort', sort);
	}
	for (const value of filters.taskCategory ?? []) {
		params.append('taskCategory', value);
	}
	if (filters.terms) {
		params.append('terms', filters.terms);
	}
	const response = await fetch(`/container/${guid}/relation?${params}`, init);
	const data = await response.json();
	return z.array(container).parse(data);
}
