import type { Reroute } from '@sveltejs/kit';
import z from 'zod';
import { isReservedContextSlug } from '$lib/models';

export const reroute: Reroute = async ({ fetch, url }) => {
	const segments = url.pathname.split('/').filter(Boolean);
	if (segments.length === 0) {
		return;
	}

	const [firstSegment, ...restSegments] = segments;
	if (isReservedContextSlug(firstSegment) || z.uuid().safeParse(firstSegment).success) {
		return;
	}

	const response = await fetch('/rewrite-map', { credentials: 'omit' });
	if (!response.ok) {
		return;
	}

	const rewriteMap = await response.json();

	if (!rewriteMap[url.hostname] || !rewriteMap[url.hostname][firstSegment]) {
		return;
	}

	return `/${rewriteMap[url.hostname][firstSegment]}/${restSegments.join('/')}`;
};
