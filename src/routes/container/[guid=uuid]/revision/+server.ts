import { error, json } from '@sveltejs/kit';
import { NotFoundError } from 'slonik';
import { _, unwrapFunctionStore } from 'svelte-i18n';
import {
	type Container,
	isContainerWithEffect,
	isContainerWithObjective,
	modifiedContainer,
	type PartialRelation,
	payloadTypes,
	predicates
} from '$lib/models';
import { getAllContainerRevisionsByGuid, getManyContainers, updateContainer } from '$lib/server/db';
import type { RequestHandler } from './$types';

export const GET = (async ({ locals, params }) => {
	try {
		return json(await locals.pool.connect(getAllContainerRevisionsByGuid(params.guid)));
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
	const parseResult = modifiedContainer.safeParse(data);

	if (!parseResult.success) {
		error(422, parseResult.error);
	} else {
		const indicators = await locals.pool.connect(
			getManyContainers(
				[parseResult.data.organization],
				{ type: [payloadTypes.enum.indicator] },
				''
			)
		);
		const indicatorsByGuid = new Map<string, Container>(indicators.map((i) => [i.guid, i]));
		const relationWithIndicators: PartialRelation[] = [];
		if (isContainerWithEffect(parseResult.data)) {
			for (const { indicator } of parseResult.data.payload.effect) {
				if (indicatorsByGuid.has(indicator)) {
					relationWithIndicators.push({
						object: indicatorsByGuid.get(indicator)?.revision as number,
						position: 0,
						predicate: predicates.enum['is-part-of']
					});
				}
			}
		}
		if (isContainerWithObjective(parseResult.data)) {
			for (const { indicator } of parseResult.data.payload.objective) {
				if (indicatorsByGuid.has(indicator)) {
					relationWithIndicators.push({
						object: indicatorsByGuid.get(indicator)?.revision as number,
						position: 0,
						predicate: predicates.enum['is-part-of']
					});
				}
			}
		}
		const relationWithoutRemovedIndicators = parseResult.data.relation.filter(
			(r) =>
				relationWithIndicators.findIndex(
					({ object, predicate }) => r.object == object && r.predicate == predicate
				) > -1 ||
				!r.object ||
				!indicators.map(({ revision }) => revision).includes(r.object)
		);
		const result = await locals.pool.connect(
			updateContainer({
				...parseResult.data,
				relation: [...relationWithoutRemovedIndicators, ...relationWithIndicators],
				user: [
					...parseResult.data.user.filter(
						({ predicate }) => predicate != predicates.enum['is-creator-of']
					),
					{ predicate: predicates.enum['is-creator-of'], subject: locals.user.guid }
				]
			})
		);
		return json(result, { status: 201, headers: { location: `/container/${result.guid}` } });
	}
}) satisfies RequestHandler;
