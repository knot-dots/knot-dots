import { error, json } from '@sveltejs/kit';
import { _, unwrapFunctionStore } from 'svelte-i18n';
import { z } from 'zod';
import type { RequestHandler } from './$types';
import {
	indicatorCategories,
	type IndicatorTemplateContainer,
	indicatorTypes,
	isGoalContainer,
	isMeasureContainer,
	payloadTypes,
	sortIndicatorsByRelevanceForGoalOrMeasure,
	sustainableDevelopmentGoals
} from '$lib/models';
import {
	getAllContainersRelatedToIndicatorTemplates,
	getContainerByGuid,
	getManyContainers
} from '$lib/server/db';

export const GET = (async ({ locals, params, url }) => {
	const expectedParams = z.object({
		indicatorCategory: z.array(indicatorCategories).default([]),
		indicatorType: z.array(indicatorTypes).default([]),
		organization: z.array(z.uuid()).default([]),
		organizationalUnit: z.array(z.uuid()).default([]),
		sdg: z.array(sustainableDevelopmentGoals).default([])
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

	const suggestion = await locals.pool.connect(async (connection) => {
		const [container, indicatorTemplateContainers] = await Promise.all([
			getContainerByGuid(params.guid)(connection),
			getManyContainers(
				[],
				{
					indicatorCategories: parseResult.data.indicatorCategory,
					indicatorTypes: parseResult.data.indicatorType,
					sdg: parseResult.data.sdg,
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
