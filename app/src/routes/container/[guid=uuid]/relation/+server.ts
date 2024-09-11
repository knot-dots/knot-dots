import { error, json } from '@sveltejs/kit';
import { NotFoundError } from 'slonik';
import { _, unwrapFunctionStore } from 'svelte-i18n';
import { z } from 'zod';
import {
	audience,
	isContainerWithEffect,
	isIndicatorContainer,
	payloadTypes,
	relation,
	strategyTypes,
	sustainableDevelopmentGoals,
	taskCategories,
	topics
} from '$lib/models';
import {
	getAllContainersRelatedToIndicator,
	getAllContainersRelatedToMeasure,
	getAllRelatedContainers,
	getContainerByGuid,
	updateContainerRelationPosition
} from '$lib/server/db';
import type { RequestHandler } from './$types';
import { filterVisible } from '$lib/authorization';

export const GET = (async ({ locals, params, url }) => {
	const expectedParams = z.object({
		assignee: z.array(z.string().uuid()).default([]),
		audience: z.array(audience).default([]),
		category: z.array(sustainableDevelopmentGoals).default([]),
		organization: z.array(z.string().uuid()).default([]),
		organizationalUnit: z.array(z.string().uuid()).default([]),
		payloadType: z.array(payloadTypes).default([]),
		relationType: z.array(z.enum(['hierarchical', 'other'])).default(['hierarchical', 'other']),
		sort: z.array(z.enum(['alpha', 'modified', 'priority'])).default(['alpha']),
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

	try {
		const container = await locals.pool.connect(getContainerByGuid(params.guid));

		let containers;

		if (isIndicatorContainer(container)) {
			containers = await locals.pool.connect(getAllContainersRelatedToIndicator(container));
		} else if (isContainerWithEffect(container)) {
			containers = await locals.pool.connect(
				getAllContainersRelatedToMeasure(
					container.revision,
					{
						assignees: parseResult.data.assignee,
						categories: parseResult.data.category,
						taskCategories: parseResult.data.taskCategory,
						terms: parseResult.data.terms[0],
						topics: parseResult.data.topic,
						type: parseResult.data.payloadType
					},
					parseResult.data.sort[0]
				)
			);
		} else {
			containers = await locals.pool.connect(
				getAllRelatedContainers(
					parseResult.data.organization,
					params.guid,
					parseResult.data.relationType,
					{
						assignees: parseResult.data.assignee,
						audience: parseResult.data.audience,
						categories: parseResult.data.category,
						organizationalUnits: parseResult.data.organizationalUnit,
						strategyTypes: parseResult.data.strategyType,
						taskCategories: parseResult.data.taskCategory,
						terms: parseResult.data.terms[0],
						topics: parseResult.data.topic,
						type: parseResult.data.payloadType
					},
					parseResult.data.sort[0]
				)
			);
		}
		return json(filterVisible(containers, locals.user));
	} catch (e) {
		if (e instanceof NotFoundError) {
			error(404, { message: unwrapFunctionStore(_)('error.not_found') });
		} else {
			throw e;
		}
	}
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
	const parseResult = z.array(relation).safeParse(data);

	if (!parseResult.success) {
		error(422, parseResult.error);
	} else {
		await locals.pool.connect(updateContainerRelationPosition(parseResult.data));
		return new Response(null, { status: 204 });
	}
}) satisfies RequestHandler;
