import { error, json } from '@sveltejs/kit';
import { _, unwrapFunctionStore } from 'svelte-i18n';
import { z } from 'zod';
import {
	audience,
	isIndicatorContainer,
	isInternalObjectiveContainer,
	relation,
	strategyTypes,
	sustainableDevelopmentGoals,
	topics
} from '$lib/models';
import {
	getAllContainersRelatedToIndicator,
	getAllRelatedContainers,
	getAllRelatedInternalObjectives,
	getContainerByGuid,
	updateContainerRelationPosition
} from '$lib/server/db';
import type { RequestHandler } from './$types';
import { filterVisible } from '$lib/authorization';

export const GET = (async ({ locals, params, url }) => {
	const expectedParams = z.object({
		audience: z.array(audience),
		category: z.array(sustainableDevelopmentGoals),
		organization: z.array(z.string().uuid()),
		organizationalUnit: z.array(z.string().uuid()),
		relationType: z.array(z.enum(['hierarchical', 'other'])),
		sort: z.array(z.enum(['alpha', 'modified'])).default(['alpha']),
		strategyType: z.array(strategyTypes),
		terms: z.array(z.string()),
		topic: z.array(topics)
	});
	const parseResult = expectedParams.safeParse(
		Object.fromEntries(
			Object.keys(expectedParams.shape).map((key) => [key, url.searchParams.getAll(key)])
		)
	);

	if (!parseResult.success) {
		throw error(400, { message: parseResult.error.message });
	}

	const container = await locals.pool.connect(getContainerByGuid(params.guid));

	let containers;
	if (isIndicatorContainer(container)) {
		containers = await locals.pool.connect(getAllContainersRelatedToIndicator(container.guid));
	} else if (isInternalObjectiveContainer(container)) {
		containers = await locals.pool.connect(
			getAllRelatedInternalObjectives(
				params.guid,
				parseResult.data.relationType,
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
					audience: parseResult.data.audience,
					categories: parseResult.data.category,
					organizationalUnits: parseResult.data.organizationalUnit,
					strategyTypes: parseResult.data.strategyType,
					topics: parseResult.data.topic,
					terms: parseResult.data.terms[0]
				},
				parseResult.data.sort[0]
			)
		);
	}
	return json(filterVisible(containers, locals.user));
}) satisfies RequestHandler;

export const POST = (async ({ locals, request }) => {
	if (!locals.user.isAuthenticated) {
		throw error(401, { message: unwrapFunctionStore(_)('error.unauthorized') });
	}

	if (request.headers.get('Content-Type') != 'application/json') {
		throw error(415, { message: unwrapFunctionStore(_)('error.unsupported_media_type') });
	}

	const data = await request.json().catch((reason: SyntaxError) => {
		throw error(400, { message: reason.message });
	});
	const parseResult = z.array(relation).safeParse(data);

	if (!parseResult.success) {
		throw error(422, parseResult.error);
	} else {
		await locals.pool.connect(updateContainerRelationPosition(parseResult.data));
		return new Response(null, { status: 204 });
	}
}) satisfies RequestHandler;
