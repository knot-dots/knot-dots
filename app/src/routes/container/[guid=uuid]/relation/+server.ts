import { error, json } from '@sveltejs/kit';
import { NotFoundError } from 'slonik';
import { _, unwrapFunctionStore } from 'svelte-i18n';
import { z } from 'zod';
import { filterVisible } from '$lib/authorization';
import {
	audience,
	isContainerWithEffect,
	isIndicatorContainer,
	type OrganizationalUnitContainer,
	payloadTypes,
	measureTypes,
	policyFieldBNK,
	predicates,
	relation,
	programTypes,
	sustainableDevelopmentGoals,
	taskCategories,
	topics
} from '$lib/models';
import {
	getAllContainersRelatedToIndicators,
	getAllContainersRelatedToMeasure,
	getAllContainersRelatedToProgram,
	getAllRelatedContainers,
	getAllRelatedOrganizationalUnitContainers,
	getContainerByGuid,
	updateManyContainerRelations
} from '$lib/server/db';
import type { RequestHandler } from './$types';

export const GET = (async ({ locals, params, url }) => {
	const expectedParams = z.object({
		assignee: z.array(z.string().uuid()).default([]),
		audience: z.array(audience).default([]),
		sdg: z.array(sustainableDevelopmentGoals).default([]),
		measureType: z.array(measureTypes).default([]),
		organization: z.array(z.string().uuid()).default([]),
		organizationalUnit: z.array(z.string().uuid()).default([]),
		payloadType: z.array(payloadTypes).default([]),
		policyFieldBNK: z.array(policyFieldBNK).default([]),
		program: z.array(z.string()).default([]),
		programType: z.array(programTypes).default([]),
		relationType: z.array(predicates).default([predicates.enum['is-part-of']]),
		sort: z.array(z.enum(['alpha', 'modified', 'priority'])).default(['alpha']),
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
			if (parseResult.data.program.length > 0) {
				const [containersRelatedToProgram, containersRelatedToIndicator] = await Promise.all([
					locals.pool.connect(getAllContainersRelatedToProgram(parseResult.data.program[0], {})),
					locals.pool.connect(getAllContainersRelatedToIndicators([container], {}))
				]);

				containers = containersRelatedToProgram.filter(({ guid }) =>
					containersRelatedToIndicator.some(
						({ guid: relatedContainerGuid }) => relatedContainerGuid === guid
					)
				);
			} else {
				let subordinateOrganizationalUnits: string[] = [];

				if (parseResult.data.organizationalUnit.length > 0) {
					const [currentOrganizationalUnit, relatedOrganizationalUnits] = (await Promise.all([
						locals.pool.connect(getContainerByGuid(parseResult.data.organizationalUnit[0])),
						locals.pool.connect(
							getAllRelatedOrganizationalUnitContainers(parseResult.data.organizationalUnit[0])
						)
					])) as [OrganizationalUnitContainer, OrganizationalUnitContainer[]];
					subordinateOrganizationalUnits = relatedOrganizationalUnits
						.filter(({ payload }) => payload.level > currentOrganizationalUnit.payload.level)
						.map(({ guid }) => guid)
						.concat(currentOrganizationalUnit.guid);
				}

				containers = await locals.pool.connect(
					getAllContainersRelatedToIndicators([container], {
						organizationalUnits: subordinateOrganizationalUnits
					})
				);
			}
		} else if (isContainerWithEffect(container)) {
			containers = await locals.pool.connect(
				getAllContainersRelatedToMeasure(
					container.guid,
					{
						assignees: parseResult.data.assignee,
						sdg: parseResult.data.sdg,
						policyFieldsBNK: parseResult.data.policyFieldBNK,
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
						sdg: parseResult.data.sdg,
						organizationalUnits: parseResult.data.organizationalUnit,
						policyFieldsBNK: parseResult.data.policyFieldBNK,
						programTypes: parseResult.data.programType,
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
		await locals.pool.connect(updateManyContainerRelations(parseResult.data));
		return new Response(null, { status: 204 });
	}
}) satisfies RequestHandler;
