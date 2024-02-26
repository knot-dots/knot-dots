import { z } from 'zod';
import { container } from '$lib/models';

export default async function fetchRelatedContainers(
	guid: string,
	filters: {
		audience?: string[];
		category?: string[];
		organization?: string[];
		organizationalUnit?: string[];
		relationType?: string[];
		strategyType?: string[];
		terms?: string;
		topic?: string[];
	},
	sort?: string
) {
	const params = new URLSearchParams();
	for (const value of filters.audience ?? []) {
		params.append('audience', value);
	}
	for (const value of filters.category ?? []) {
		params.append('category', value);
	}
	for (const value of filters.organization ?? []) {
		params.append('organization', value);
	}
	for (const value of filters.organizationalUnit ?? []) {
		params.append('organizationalUnit', value);
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
	if (filters.terms) {
		params.append('terms', filters.terms);
	}
	for (const value of filters.topic ?? []) {
		params.append('topic', value);
	}
	const response = await fetch(`/container/${guid}/relation?${params}`);
	const data = await response.json();
	return z.array(container).parse(data);
}
