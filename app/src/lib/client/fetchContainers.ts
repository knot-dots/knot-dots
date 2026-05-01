import { z } from 'zod';
import { page } from '$app/state';
import withRequestCoalescing from '$lib/client/withRequestCoalescing';
import { anyContainer } from '$lib/models';

export default async function fetchContainers(
	filters: {
		[key: string]: string | string[] | undefined;
		assignee?: string[];
		guid?: string[];
		indicatorCategory?: string[];
		indicatorType?: string[];
		organization?: string[];
		organizationalUnit?: string[];
		payloadType?: string[];
		programType?: string[];
		relatedTo?: string[];
		relationType?: string[];
		taskCategory?: string[];
		template?: string;
		terms?: string;
	},
	sort?: string,
	init?: RequestInit
) {
	const params = new URLSearchParams();
	page.data.categoryContext?.keys.forEach((key) => {
		for (const value of (filters[key] as string[]) ?? []) {
			params.append(key, value);
		}
	});
	for (const value of filters.assignee ?? []) {
		params.append('assignee', value);
	}
	for (const value of filters.guid ?? []) {
		params.append('guid', value);
	}
	for (const value of filters.indicatorCategory ?? []) {
		params.append('indicatorCategory', value);
	}
	for (const value of filters.indicatorType ?? []) {
		params.append('indicatorType', value);
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
	for (const value of filters.programType ?? []) {
		params.append('programType', value);
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
	for (const value of filters.taskCategory ?? []) {
		params.append('taskCategory', value);
	}
	if (filters.template) {
		params.append('template', 'true');
	}
	if (filters.terms) {
		params.append('terms', filters.terms);
	}
	const response = await withRequestCoalescing(fetch)(`/container?${params}`, init);
	if (!response.ok) {
		throw new Error(
			`Failed to fetch containers: ${response.status} ${await response.clone().text()}`
		);
	}
	return z.array(anyContainer).parse(await response.clone().json());
}
