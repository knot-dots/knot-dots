import { error, json } from '@sveltejs/kit';
import { NotFoundError, UniqueIntegrityConstraintViolationError } from 'slonik';
import { _, unwrapFunctionStore } from 'svelte-i18n';
import { z } from 'zod';
import defineAbilityFor, { filterVisible } from '$lib/authorization';
import { isServerOwnedCopyRelationPredicate } from '$lib/containerCopy';
import {
	administrativeTypes,
	indicatorCategories,
	indicatorTypes,
	isProgramContainer,
	newContainer,
	payloadTypes,
	predicates,
	programTypes,
	taskCategories
} from '$lib/models';
import { loadCategoryContext } from '$lib/server/categoryOptions';
import {
	createContainer,
	getContainerByGuid,
	getManyContainers,
	getManyOrganizationContainers
} from '$lib/server/db';
import { extractCustomCategoryFilters } from '$lib/utils/customCategoryFilters';
import type { RequestHandler } from './$types';

export const GET = (async ({ locals, url }) => {
	const expectedParams = z.object({
		administrativeType: z.array(administrativeTypes).default([]),
		assignee: z.array(z.string().uuid()).default([]),
		availableIn: z.array(z.string().uuid()).max(1).default([]),
		federalState: z.array(z.string()).default([]),
		guid: z.array(z.string().uuid()).default([]),
		indicator: z.array(z.string().uuid()).default([]),
		indicatorCategory: z.array(indicatorCategories).default([]),
		resource: z.array(z.string().uuid()).default([]),
		indicatorType: z.array(indicatorTypes).default([]),
		limit: z.coerce.number().int().positive().optional(),
		offset: z.coerce.number().int().nonnegative().default(0),
		organization: z.array(z.string().uuid()).default([]),
		organizationalUnit: z
			.array(z.string().uuid())
			.or(
				z
					.array(z.literal(''))
					.length(1)
					.transform(() => null)
			)
			.default([]),
		payloadType: z.array(payloadTypes).default([]),
		programType: z.array(programTypes).default([]),
		relatedTo: z.array(z.string().uuid()).default([]),
		relationType: z.array(predicates).default([predicates.enum['is-part-of']]),
		sort: z.array(z.enum(['alpha', 'modified', 'priority'])).default(['alpha']),
		categoryMatch: z.array(z.enum(['any', 'all'])).default(['all']),
		taskCategory: z.array(taskCategories).default([]),
		template: z.array(z.stringbool()).default([]),
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
	if (parseResult.data.availableIn.length > 0 && parseResult.data.template[0] !== true) {
		error(400, { message: unwrapFunctionStore(_)('error.bad_request') });
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

	const containers = await locals.pool.connect(
		getManyContainers(
			parseResult.data.organization,
			{
				administrativeTypes: parseResult.data.administrativeType,
				availableIn: parseResult.data.availableIn[0],
				customCategories,
				customCategoryMatch: parseResult.data.categoryMatch[0],
				guid: parseResult.data.guid,
				federalStates: parseResult.data?.federalState,
				indicators: parseResult.data.indicator,
				indicatorCategories: parseResult.data.indicatorCategory,
				resource: parseResult.data.resource,
				indicatorTypes: parseResult.data.indicatorType,
				organizationalUnits: parseResult.data.organizationalUnit,
				programTypes: parseResult.data.programType,
				template: parseResult.data.template[0] ?? false,
				terms: parseResult.data.terms[0],
				type: parseResult.data.payloadType
			},
			parseResult.data.sort[0],
			{
				limit: parseResult.data.limit,
				offset: parseResult.data.offset
			}
		)
	);

	return json(filterVisible(containers, locals.user));
}) satisfies RequestHandler;

export const POST = (async ({ locals, request }) => {
	if (!locals.user.isAuthenticated) {
		error(401, { message: unwrapFunctionStore(_)('error.unauthorized') });
	}

	if (request.headers.get('content-type')?.split(';', 1)[0].trim() !== 'application/json') {
		error(415, { message: unwrapFunctionStore(_)('error.unsupported_media_type') });
	}

	const data = await request.json().catch(() => {
		error(400, { message: unwrapFunctionStore(_)('error.bad_request') });
	});
	const parseResult = newContainer.safeParse(data);

	if (!parseResult.success) {
		error(422, parseResult.error);
	}
	if (
		parseResult.data.relation.some(({ predicate }) => isServerOwnedCopyRelationPredicate(predicate))
	) {
		error(422, { message: unwrapFunctionStore(_)('error.copy_invalid') });
	}

	const ability = defineAbilityFor(locals.user);
	if (ability.cannot('create', parseResult.data)) {
		error(403, { message: unwrapFunctionStore(_)('error.forbidden') });
	}

	const availableInRelations = parseResult.data.relation.filter(
		({ predicate }) => predicate === predicates.enum['is-available-in']
	);
	if (availableInRelations.length > 0) {
		const [availability] = availableInRelations;
		if (
			availableInRelations.length !== 1 ||
			availability.subject !== undefined ||
			availability.object === undefined ||
			!('template' in parseResult.data.payload) ||
			parseResult.data.payload.template !== true
		) {
			error(422, { message: unwrapFunctionStore(_)('error.bad_request') });
		}

		const program = await locals.pool
			.connect(getContainerByGuid(availability.object))
			.catch((caught: unknown) => {
				if (caught instanceof NotFoundError) {
					error(422, { message: unwrapFunctionStore(_)('error.bad_request') });
				}
				throw caught;
			});
		if (!isProgramContainer(program)) {
			error(422, { message: unwrapFunctionStore(_)('error.bad_request') });
		}
		if (ability.cannot('read', program) || ability.cannot('update', program)) {
			error(403, { message: unwrapFunctionStore(_)('error.forbidden') });
		}
	}

	try {
		const result = await locals.pool.connect(
			createContainer({
				...parseResult.data,
				user: [
					{
						predicate: predicates.enum['is-creator-of'],
						subject: locals.user.guid
					}
				]
			})
		);

		return json(result, { status: 201, headers: { location: `/container/${result.guid}` } });
	} catch (caught: unknown) {
		if (
			caught instanceof UniqueIntegrityConstraintViolationError &&
			(caught.constraint === 'container_payload_organization_slug_key' ||
				caught.constraint === 'container_payload_organizational_unit_slug_key')
		) {
			error(409, { message: unwrapFunctionStore(_)('error.slug_not_available') });
		}
		throw caught;
	}
}) satisfies RequestHandler;
