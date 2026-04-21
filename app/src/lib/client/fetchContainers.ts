import { z } from 'zod';
import { page } from '$app/state';
import withRequestCoalescing from '$lib/client/withRequestCoalescing';
import { createFeatureDecisions } from '$lib/features';
import { anyContainer } from '$lib/models';

export default async function fetchContainers(
	filters: {
		[key: string]: string | string[] | undefined;
		assignee?: string[];
		audience?: string[];
		guid?: string[];
		indicatorCategory?: string[];
		indicatorType?: string[];
		organization?: string[];
		organizationalUnit?: string[];
		payloadType?: string[];
		policyFieldBNK?: string[];
		programType?: string[];
		relatedTo?: string[];
		relationType?: string[];
		sdg?: string[];
		taskCategory?: string[];
		terms?: string;
		topic?: string[];
	},
	sort?: string,
	init?: RequestInit
) {
	const params = new URLSearchParams();
	if (createFeatureDecisions(page.data.features).useCustomCategories()) {
		page.data.categoryContext?.keys.forEach((key) => {
			for (const value of (filters[key] as string[]) ?? []) {
				params.append(key, value);
			}
		});
	} else {
		for (const value of filters.audience ?? []) {
			params.append('audience', value);
		}
		for (const value of filters.policyFieldBNK ?? []) {
			params.append('policyFieldBNK', value);
		}
		for (const value of filters.sdg ?? []) {
			params.append('sdg', value);
		}
		for (const value of filters.topic ?? []) {
			params.append('topic', value);
		}
	}
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
	const response = await withRequestCoalescing(fetch)(`/container?${params}`, init);
	if (!response.ok) {
		throw new Error(
			`Failed to fetch containers: ${response.status} ${await response.clone().text()}`
		);
	}
	return z.array(anyContainer).parse(await response.clone().json());
}
