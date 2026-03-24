import { z } from 'zod';
import { container } from '$lib/models';

export default async function fetchSuggestedContainers(
	guid: string,
	filters: {
		indicatorCategory?: string[];
		indicatorType?: string[];
		organization?: string[];
		organizationalUnit?: string[];
		sdg?: string[];
		terms?: string;
	},
	init?: RequestInit
) {
	const params = new URLSearchParams();
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
	for (const value of filters.sdg ?? []) {
		params.append('sdg', value);
	}
	if (filters.terms) {
		params.append('terms', filters.terms);
	}
	const response = await fetch(`/container/${guid}/suggestion?${params}`, init);
	const data = await response.json();
	return z.array(container).parse(data);
}
