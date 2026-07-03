import { error, json } from '@sveltejs/kit';
import { NotFoundError } from 'slonik';
import { _, unwrapFunctionStore } from 'svelte-i18n';
import { z } from 'zod';
import defineAbilityFor, { canSubscribeForOrg, filterVisible } from '$lib/authorization';
import {
	type AnyContainer,
	isContainerWithEffect,
	isIndicatorTemplateContainer,
	isProgramContainer,
	type OrganizationalUnitContainer,
	payloadTypes,
	predicates,
	programTypes,
	relation,
	taskCategories,
	visibility
} from '$lib/models';
import { loadCategoryContext } from '$lib/server/categoryOptions';
import {
	deleteManyContainerRelations,
	getAllContainersRelatedToIndicatorTemplates,
	getAllContainersRelatedToMeasure,
	getAllContainersRelatedToProgram,
	getAllRelatedContainers,
	getAllRelatedOrganizationalUnitContainers,
	getContainerByGuid,
	getManyContainers,
	getManyOrganizationContainers,
	updateManyContainerRelations
} from '$lib/server/db';
import { extractCustomCategoryFilters } from '$lib/utils/customCategoryFilters';
import type { RequestHandler } from './$types';

export const GET = (async ({ locals, params, url }) => {
	const expectedParams = z.object({
		assignee: z.array(z.string().uuid()).default([]),
		organization: z.array(z.string().uuid()).default([]),
		organizationalUnit: z.array(z.string().uuid()).default([]),
		payloadType: z.array(payloadTypes).default([]),
		program: z.array(z.string()).default([]),
		programType: z.array(programTypes).default([]),
		relationType: z.array(predicates).default([predicates.enum['is-part-of']]),
		sort: z.array(z.enum(['alpha', 'modified', 'priority'])).default(['alpha']),
		taskCategory: z.array(taskCategories).default([]),
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

	try {
		const container = await locals.pool.connect(getContainerByGuid(params.guid));

		let containers;

		if (isIndicatorTemplateContainer(container)) {
			if (parseResult.data.program.length > 0) {
				const [containersRelatedToProgram, containersRelatedToIndicator] = await Promise.all([
					locals.pool.connect(getAllContainersRelatedToProgram(parseResult.data.program[0], {})),
					locals.pool.connect(
						getAllContainersRelatedToIndicatorTemplates(
							[container],
							{
								organizations: parseResult.data.organization,
								organizationalUnits: parseResult.data.organizationalUnit
							},
							{
								organizations: parseResult.data.organization,
								organizationalUnits:
									parseResult.data.organizationalUnit.length > 0
										? parseResult.data?.organizationalUnit
										: null
							}
						)
					)
				]);

				containers = containersRelatedToProgram.filter(({ guid }) =>
					containersRelatedToIndicator.some(
						({ guid: relatedContainerGuid }) => relatedContainerGuid === guid
					)
				);
			} else {
				let subordinateOrganizationalUnits: string[] = [];

				if (parseResult.data.organizationalUnit.length == 1) {
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
					getAllContainersRelatedToIndicatorTemplates(
						[container],
						{
							organizations: parseResult.data.organization,
							organizationalUnits: subordinateOrganizationalUnits
						},
						{
							organizations: parseResult.data.organization,
							organizationalUnits:
								parseResult.data.organizationalUnit.length > 0
									? parseResult.data.organizationalUnit
									: null
						}
					)
				);
			}
		} else if (isProgramContainer(container)) {
			containers = await locals.pool.connect(
				getAllContainersRelatedToProgram(container.guid, {
					customCategories,
					terms: parseResult.data.terms[0],
					type: parseResult.data.payloadType
				})
			);
		} else if (isContainerWithEffect(container)) {
			containers = await locals.pool.connect(
				getAllContainersRelatedToMeasure(
					container.guid,
					{
						assignees: parseResult.data.assignee,
						customCategories,
						taskCategories: parseResult.data.taskCategory,
						terms: parseResult.data.terms[0],
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
						customCategories,
						organizationalUnits: parseResult.data.organizationalUnit,
						programTypes: parseResult.data.programType,
						taskCategories: parseResult.data.taskCategory,
						terms: parseResult.data.terms[0],
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

export const POST = (async ({ locals, params, request }) => {
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
	}

	const ability = defineAbilityFor(locals.user);

	await locals.pool.transaction(async (tx) => {
		// This route only allows updating relations if the container
		// represented by the guid parameter of the route is either the subject or
		// the object. To ensure consistency with the front-end, the permission to
		// relate the container represented by the guid parameter of the route and
		// the permission to read the other are required.
		const containers = await getManyContainers(
			[],
			{
				guid: parseResult.data
					.filter(({ object, subject }) => object == params.guid || subject == params.guid)
					.flatMap(({ object, subject }) => [object, subject])
			},
			'alpha'
		)(tx);
		await updateManyContainerRelations(
			parseResult.data
				.filter(({ object, subject }) => object == params.guid || subject == params.guid)
				.filter(({ object, predicate, subject }) => {
					const objectContainer = containers.find(
						(c) => ability.can('read', c) && c.guid === object
					);
					const subjectContainer = containers.find(
						(c) => ability.can('read', c) && c.guid === subject
					);

					if (!objectContainer || !subjectContainer) {
						return false;
					}

					// Subscribing an organization or organizational unit to a public rule-set
					// program does not require 'relate' permission on the (foreign) program.
					// Instead the user must be allowed to subscribe on behalf of the
					// subscribing organization or organizational unit.
					if (predicate === predicates.enum['is-subscribed-to']) {
						return (
							isProgramContainer(objectContainer) &&
							objectContainer.payload.programType ===
								programTypes.enum['program_type.set_of_rules'] &&
							objectContainer.payload.visibility === visibility.enum.public &&
							canSubscribeForOrg(locals.user, subject)
						);
					}

					return ability.can(
						'relate',
						[subjectContainer, objectContainer].find((c) => c.guid == params.guid) as AnyContainer
					);
				})
		)(tx);
	});

	return new Response(null, { status: 204 });
}) satisfies RequestHandler;

export const DELETE = (async ({ locals, request }) => {
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
		await locals.pool.connect(deleteManyContainerRelations(parseResult.data));
		return new Response(null, { status: 204 });
	}
}) satisfies RequestHandler;
