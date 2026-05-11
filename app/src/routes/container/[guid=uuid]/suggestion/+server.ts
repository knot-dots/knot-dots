import { error, json } from '@sveltejs/kit';
import { _, unwrapFunctionStore } from 'svelte-i18n';
import { z } from 'zod';
import {
	indicatorCategories,
	type IndicatorTemplateContainer,
	indicatorTypes,
	isGoalContainer,
	isMeasureContainer,
	payloadTypes,
	sortIndicatorsByRelevanceForGoalOrMeasure
} from '$lib/models';
import { loadCategoryContext } from '$lib/server/categoryOptions';
import {
	getAllContainersRelatedToIndicatorTemplates,
	getContainerByGuid,
	getManyContainers,
	getManyOrganizationContainers
} from '$lib/server/db';
import { extractCustomCategoryFilters } from '$lib/utils/customCategoryFilters';
import type { RequestHandler } from './$types';

export const GET = (async ({ locals, params, url }) => {
	const expectedParams = z.object({
		indicatorCategory: z.array(indicatorCategories).default([]),
		indicatorType: z.array(indicatorTypes).default([]),
		organization: z.array(z.uuid()).default([]),
		organizationalUnit: z.array(z.uuid()).default([])
	});

	const parseResult = expectedParams.safeParse(
		Object.fromEntries(
			Object.keys(expectedParams.shape).map((key) => [
				key,
				url.searchParams.has(key) ? url.searchParams.getAll(key) : undefined
			])
		)
	);

	if (!parseResult.success) {
		error(400, { message: parseResult.error.message });
	}

	const organizations = await locals.pool.connect(
		getManyOrganizationContainers({ default: true }, '')
	);

	const categoryContext = await loadCategoryContext({
		connect: locals.pool.connect,
		scope:
			organizations.length > 0
				? [organizations[0].guid, ...parseResult.data.organization]
				: parseResult.data.organization,
		user: locals.user
	});

	const customCategories = extractCustomCategoryFilters(url, categoryContext.keys);

	const suggestion = await locals.pool.connect(async (connection) => {
		const [container, indicatorTemplateContainers] = await Promise.all([
			getContainerByGuid(params.guid)(connection),
			getManyContainers(
				[],
				{
					customCategories,
					indicatorCategories: parseResult.data.indicatorCategory,
					indicatorTypes: parseResult.data.indicatorType,
					type: [payloadTypes.enum.indicator_template]
				},
				'alpha'
			)(connection) as Promise<IndicatorTemplateContainer[]>
		]);

		if (!isGoalContainer(container) && !isMeasureContainer(container)) {
			error(404, { message: unwrapFunctionStore(_)('error.not_found') });
		}

		const containersRelatedToIndicators = await getAllContainersRelatedToIndicatorTemplates(
			indicatorTemplateContainers,
			{
				organizations: parseResult.data.organization,
				organizationalUnits: parseResult.data.organizationalUnit
			},
			{
				organizations: parseResult.data.organization,
				organizationalUnits:
					parseResult.data.organizationalUnit.length > 0
						? parseResult.data.organizationalUnit
						: null
			}
		)(connection);

		return sortIndicatorsByRelevanceForGoalOrMeasure(
			indicatorTemplateContainers,
			containersRelatedToIndicators,
			container
		);
	});

	return json(suggestion);
}) satisfies RequestHandler;
