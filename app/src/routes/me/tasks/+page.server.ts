import { error } from '@sveltejs/kit';
import { _, unwrapFunctionStore } from 'svelte-i18n';
import { filterVisible } from '$lib/authorization';
import {
	computeFacetCount,
	fromCounts,
	isAssignedTo,
	isContainerWithPayloadType,
	payloadTypes,
	taskCategories
} from '$lib/models';
import { getAllContainersRelatedToUser } from '$lib/server/db';
import { createFeatureDecisions } from '$lib/features';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user.isAuthenticated) {
		error(401, { message: unwrapFunctionStore(_)('error.unauthorized') });
	}

	const containers = await locals.pool.connect(getAllContainersRelatedToUser(locals.user.guid));

	const filtered = filterVisible(
		containers
			.filter((c) => isContainerWithPayloadType(payloadTypes.enum.task, c))
			.filter(isAssignedTo(locals.user)),
		locals.user
	);

	const features = createFeatureDecisions(locals.features);
	const _facets = new Map<string, Map<string, number>>([
		['taskCategory', fromCounts(taskCategories.options as string[])]
	]);
	const facets = computeFacetCount(_facets, filtered, {
		useCategoryPayload: features.useCustomCategories()
	});

	return {
		containers: filtered,
		facets
	};
};
