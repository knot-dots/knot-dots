import { z } from 'zod';
import { anyContainer } from '$lib/models';
import type { PayloadType } from '$lib/models';

export default async function fetchContainers(filters: {
	implements?: number[];
	isPartOfStrategy?: number[];
	organization?: string[];
	organizationalUnit?: string[];
	payloadType?: PayloadType[];
}) {
	const params = new URLSearchParams();
	for (const value of filters.implements ?? []) {
		params.append('implements', String(value));
	}
	for (const value of filters.isPartOfStrategy ?? []) {
		params.append('isPartOfStrategy', String(value));
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
	const response = await fetch(`/container?${params}`);
	const data = await response.json();
	return z.array(anyContainer).parse(data);
}
