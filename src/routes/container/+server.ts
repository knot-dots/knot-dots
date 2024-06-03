import { error, json } from '@sveltejs/kit';
import { _, unwrapFunctionStore } from 'svelte-i18n';
import { z } from 'zod';
import { filterVisible } from '$lib/authorization';
import {
	audience,
	type Container,
	indicatorCategories,
	indicatorTypes,
	measureTypes,
	newContainer,
	payloadTypes,
	predicates,
	strategyTypes,
	sustainableDevelopmentGoals,
	taskCategories,
	topics
} from '$lib/models';
import {
	createContainer,
	getAllContainersRelatedToMeasure,
	getAllContainersRelatedToStrategy,
	getAllRelatedInternalObjectives,
	getManyContainers,
	getManyTaskContainers
} from '$lib/server/db';
import type { RequestHandler } from './$types';

export const GET = (async ({ locals, url }) => {
	const expectedParams = z.object({
		assignee: z.array(z.string().uuid()).default([]),
		audience: z.array(audience).default([]),
		category: z.array(sustainableDevelopmentGoals).default([]),
		indicatorCategory: z.array(indicatorCategories).default([]),
		indicatorType: z.array(indicatorTypes).default([]),
		isPartOfMeasure: z.array(z.coerce.number().int().positive()).default([]),
		isPartOfStrategy: z.array(z.coerce.number().int().positive()).default([]),
		measureType: z.array(measureTypes).default([]),
		organization: z.array(z.string().uuid()).default([]),
		organizationalUnit: z.array(z.string().uuid()).default([]),
		payloadType: z.array(payloadTypes).default([]),
		relatedTo: z.array(z.string().uuid()).default([]),
		relationType: z.array(z.enum(['hierarchical', 'other'])).default(['hierarchical', 'other']),
		sort: z.array(z.enum(['alpha', 'modified'])).default(['alpha']),
		strategyType: z.array(strategyTypes).default([]),
		taskCategory: z.array(taskCategories).default([]),
		terms: z.array(z.string()).default([]),
		topic: z.array(topics).default([])
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

	let containers: Container[];

	if (parseResult.data.isPartOfStrategy.length > 0) {
		containers = await locals.pool.connect(
			getAllContainersRelatedToStrategy(parseResult.data.isPartOfStrategy[0], {
				categories: parseResult.data.category,
				topics: parseResult.data.topic,
				type: parseResult.data.payloadType
			})
		);
	} else if (
		parseResult.data.isPartOfMeasure.length > 0 &&
		parseResult.data.payloadType[0] == payloadTypes.enum['internal_objective.task']
	) {
		containers = await locals.pool.connect(
			getManyTaskContainers({
				assignees: parseResult.data.assignee,
				measure: parseResult.data.isPartOfMeasure[0],
				taskCategories: parseResult.data.taskCategory,
				terms: parseResult.data.terms[0]
			})
		);
	} else if (parseResult.data.isPartOfMeasure.length > 0) {
		if (parseResult.data.relatedTo.length > 0) {
			containers = await locals.pool.connect(
				getAllRelatedInternalObjectives(
					parseResult.data.relatedTo[0],
					parseResult.data.relationType,
					{ type: parseResult.data.payloadType },
					parseResult.data.sort[0]
				)
			);
		} else {
			containers = await locals.pool.connect(
				getAllContainersRelatedToMeasure(
					parseResult.data.isPartOfMeasure[0],
					{
						terms: parseResult.data.terms[0]
					},
					parseResult.data.sort[0]
				)
			);
		}
	} else {
		containers = await locals.pool.connect(
			getManyContainers(
				parseResult.data.organization,
				{
					audience: parseResult.data.audience,
					categories: parseResult.data.category,
					indicatorCategories: parseResult.data.indicatorCategory,
					indicatorTypes: parseResult.data.indicatorType,
					measureTypes: parseResult.data.measureType,
					organizationalUnits: parseResult.data.organizationalUnit,
					strategyTypes: parseResult.data.strategyType,
					terms: parseResult.data.terms[0],
					topics: parseResult.data.topic,
					type: parseResult.data.payloadType
				},
				parseResult.data.sort[0]
			)
		);
	}

	return json(filterVisible(containers, locals.user));
}) satisfies RequestHandler;

export const POST = (async ({ locals, request }) => {
	if (!locals.user.isAuthenticated) {
		error(401, { message: unwrapFunctionStore(_)('error.unauthorized') });
	}

	if (request.headers.get('Content-Type') != 'application/json') {
		error(415, { message: unwrapFunctionStore(_)('error.unsupported_media_type') });
	}

	const data = await request.json().catch((reason: SyntaxError) => {
		error(400, { message: reason.message });
	});
	const parseResult = newContainer.safeParse(data);

	if (!parseResult.success) {
		error(422, parseResult.error);
	} else {
		const result = await locals.pool.connect(
			createContainer({
				...parseResult.data,
				user: [{ predicate: predicates.enum['is-creator-of'], subject: locals.user.guid }]
			})
		);
		return json(result, { status: 201, headers: { location: `/container/${result.guid}` } });
	}
}) satisfies RequestHandler;
