import { error, json } from '@sveltejs/kit';
import { NotFoundError } from 'slonik';
import { _, unwrapFunctionStore } from 'svelte-i18n';
import { z } from 'zod';
import { env } from '$env/dynamic/public';
import { filterVisible } from '$lib/authorization';
import {
	type AnyContainer,
	audience,
	isContainerWithEffect,
	isIndicatorContainer,
	measureTypes,
	type OrganizationalUnitContainer,
	type OrganizationContainer,
	payloadTypes,
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
	getManyOrganizationalUnitContainers,
	getManyOrganizationContainers,
	setUp,
	updateManyContainerRelations
} from '$lib/server/db';
import type { RequestHandler } from './$types';

export const GET = (async ({ locals, params, url }) => {
	const expectedParams = z.object({
		assignee: z.array(z.string().uuid()).default([]),
		audience: z.array(audience).default([]),
		category: z.array(sustainableDevelopmentGoals).default([]),
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
				let currentOrganization;
				let currentOrganizationalUnit: OrganizationalUnitContainer | undefined;

				async function filterVisibleAsync<T extends AnyContainer>(promise: Promise<Array<T>>) {
					const containers = await promise;
					return filterVisible(containers, locals.user);
				}

				const [organizations, organizationalUnits] = await Promise.all([
					filterVisibleAsync(locals.pool.connect(getManyOrganizationContainers({}, 'alpha'))),
					filterVisibleAsync(locals.pool.connect(getManyOrganizationalUnitContainers({})))
				]);

				if (url.hostname === new URL(env.PUBLIC_BASE_URL ?? '').hostname) {
					currentOrganization = organizations.find(({ payload }) => payload.default);
					if (!currentOrganization) {
						currentOrganization = (await locals.pool.connect(
							setUp('knotdots.net', env.PUBLIC_KC_REALM ?? '')
						)) as OrganizationContainer;
					}
				} else {
					currentOrganization = organizations.find(({ guid }) =>
						url.hostname.startsWith(`${guid}.`)
					);
				}

				if (!currentOrganization) {
					currentOrganizationalUnit = organizationalUnits.find(({ guid }) =>
						url.hostname.startsWith(`${guid}.`)
					);

					currentOrganization = organizations.find(
						({ guid }) => guid === currentOrganizationalUnit?.organization
					);
				}

				let subordinateOrganizationalUnits: string[] = [];

				if (currentOrganizationalUnit) {
					const relatedOrganizationalUnits = await locals.pool.connect(
						getAllRelatedOrganizationalUnitContainers(currentOrganizationalUnit.guid)
					);
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
						categories: parseResult.data.category,
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
						categories: parseResult.data.category,
						measureTypes: parseResult.data.measureType,
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
