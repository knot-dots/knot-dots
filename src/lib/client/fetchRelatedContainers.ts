import { z } from 'zod';
import { container } from '$lib/models';

export default async function fetchRelatedContainers(
	guid: string,
	filters: {
		organization?: string[];
		organizationalUnit?: string[];
		relationType?: string[];
	}
) {
	const params = new URLSearchParams();
	for (const value of filters.organization ?? []) {
		params.append('organization', value);
	}
	for (const value of filters.organizationalUnit ?? []) {
		params.append('organizationalUnit', value);
	}
	for (const value of filters.relationType ?? []) {
		params.append('relationType', value);
	}
	const response = await fetch(`/container/${guid}/relation?${params}`);
	const data = await response.json();
	return z.array(container).parse(data);
}
