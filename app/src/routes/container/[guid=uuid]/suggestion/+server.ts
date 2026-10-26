import { error, json } from '@sveltejs/kit';
import { NotFoundError } from 'slonik';
import { _, unwrapFunctionStore } from 'svelte-i18n';
import { z } from 'zod';
import defineAbilityFor, { filterVisible } from '$lib/authorization';
import {
	type BinaryIndicatorPayload,
	type Container,
	indicatorCategories,
	type IndicatorPayload,
	indicatorTypes,
	isGoalContainer,
	isMeasureContainer,
	payloadTypes,
	scoreIndicatorsByRelevanceForGoalOrMeasure
} from '$lib/models';
import { loadCategoryContext } from '$lib/server/categoryOptions';
import {
	getAllContainersRelatedToIndicators,
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
		organizationalUnit: z.array(z.uuid()).default([]),
		terms: z.array(z.string()).default([])
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
		const [container, indicatorContainers] = await Promise.all([
			getContainerByGuid(params.guid)(connection).catch((e: unknown) => {
				if (e instanceof NotFoundError) {
					error(404, { message: unwrapFunctionStore(_)('error.not_found') });
				}
				throw e;
			}),
			getManyContainers(
				[],
				{
					customCategories,
					indicatorCategories: parseResult.data.indicatorCategory,
					indicatorTypes: parseResult.data.indicatorType,
					template: false,
					terms: parseResult.data.terms[0],
					type: [payloadTypes.enum.indicator, payloadTypes.enum.binary_indicator]
				},
				'alpha'
			)(connection) as Promise<Array<Container<BinaryIndicatorPayload | IndicatorPayload>>>
		]);

		if (
			(!isGoalContainer(container) && !isMeasureContainer(container)) ||
			defineAbilityFor(locals.user).cannot('read', container)
		) {
			error(404, { message: unwrapFunctionStore(_)('error.not_found') });
		}

		const containersRelatedToIndicators = await getAllContainersRelatedToIndicators(
			indicatorContainers,
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

		return scoreIndicatorsByRelevanceForGoalOrMeasure(
			filterVisible(indicatorContainers, locals.user),
			containersRelatedToIndicators,
			container
		);
	});

	return json(suggestion);
}) satisfies RequestHandler;
