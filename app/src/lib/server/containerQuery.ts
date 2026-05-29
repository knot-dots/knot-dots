import { error } from '@sveltejs/kit';
import { z } from 'zod';
import { filterVisible } from '$lib/authorization';
import {
	buildCategoryFacetsWithCounts,
	type CategoryContext,
	filterCategoryContext
} from '$lib/categoryOptions';
import {
	administrativeTypes,
	type AnyContainer,
	computeFacetCount,
	findDescendants,
	fromCounts,
	goalStatus,
	indicatorCategories,
	indicatorTypes,
	levels,
	payloadTypes,
	predicates,
	programStatus,
	programTypes,
	resourceCategories,
	resourceUnits,
	ruleStatus,
	status,
	taskCategories,
	taskStatus
} from '$lib/models';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '$lib/pagination';
import { loadCategoryContext } from '$lib/server/categoryOptions';
import { loadApplicationContext } from '$lib/server/applicationContext';
import {
	getAllRelatedContainers,
	getManyContainers,
	getManyOrganizationContainers
} from '$lib/server/db';
import { getManyContainersWithES } from '$lib/server/elasticsearch';
import type { User } from '$lib/stores';
import { extractCustomCategoryFilters } from '$lib/utils/customCategoryFilters';
import type { DatabaseConnection } from 'slonik';

type Connect = <T>(fn: (connection: DatabaseConnection) => Promise<T>) => Promise<T>;

export type ContainerV2Response = {
	containers: AnyContainer[];
	page: {
		limit: number;
		offset: number;
		total: number;
		hasMore: boolean;
		nextOffset: number | null;
	};
	facets: Record<string, Record<string, number>>;
};

const querySchema = z.object({
	administrativeType: z.array(administrativeTypes).default([]),
	assignee: z.array(z.string().uuid()).default([]),
	categoryMatch: z.array(z.enum(['any', 'all'])).default(['all']),
	contextGuid: z.array(z.string().uuid()).default([]),
	excludeRelation: z.array(predicates).default([]),
	federalState: z.array(z.string()).default([]),
	goalStatus: z.array(goalStatus).default([]),
	guid: z.array(z.string().uuid()).default([]),
	hierarchyLevel: z.array(z.coerce.number().int().gte(1).lte(6)).default([]),
	indicator: z.array(z.string().uuid()).default([]),
	indicatorCategory: z.array(indicatorCategories).default([]),
	indicatorType: z.array(indicatorTypes).default([]),
	included: z.array(z.enum(['subordinate_organizational_units'])).default([]),
	limit: z.coerce.number().int().positive().max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
	member: z.array(z.string().uuid()).default([]),
	level: z.array(levels).default([]),
	offset: z.coerce.number().int().nonnegative().default(0),
	organization: z
		.array(z.string().uuid())
		.or(
			z
				.array(z.literal('ANY'))
				.length(1)
				.transform(() => undefined)
		)
		.default([]),
	organizationalUnit: z
		.array(z.string().uuid())
		.or(
			z
				.array(z.literal(''))
				.length(1)
				.transform(() => null)
		)
		.default([]),
	programStatus: z.array(programStatus).default([]),
	programType: z.array(programTypes).default([]),
	relatedTo: z.array(z.string().uuid()).default([]),
	relationType: z.array(predicates).default([predicates.enum['is-part-of']]),
	resource: z.array(z.string()).default([]),
	resourceCategory: z.array(resourceCategories).default([]),
	ruleStatus: z.array(ruleStatus).default([]),
	sort: z.array(z.enum(['alpha', 'modified', 'priority'])).default(['alpha']),
	status: z.array(status).default([]),
	taskCategory: z.array(taskCategories).default([]),
	taskStatus: z.array(taskStatus).default([]),
	template: z.array(z.stringbool()).default([]),
	terms: z.array(z.string()).default([]),
	type: z.array(payloadTypes).default([])
});

type ContainerQueryParams = Omit<
	z.infer<typeof querySchema>,
	'categoryMatch' | 'contextGuid' | 'sort' | 'template' | 'terms'
> & {
	categoryMatch: 'any' | 'all';
	contextGuid: string | undefined;
	sort: 'alpha' | 'modified' | 'priority';
	template: boolean | undefined;
	terms: string;
};

function parseContainerQuery(url: URL): ContainerQueryParams {
	const raw = Object.fromEntries(
		Object.keys(querySchema.shape).map((key) => {
			if (key === 'relatedTo') {
				return [
					key,
					url.searchParams.has('relatedTo')
						? url.searchParams.getAll('relatedTo')
						: url.searchParams.getAll('related-to')
				];
			} else if (key === 'type') {
				return [
					key,
					url.searchParams.has('type')
						? url.searchParams.getAll('type')
						: url.searchParams.getAll('payloadType')
				];
			} else if (key === 'included' && !url.searchParams.has('includedChanged')) {
				return [key, ['subordinate_organizational_units']];
			}
			return [key, url.searchParams.has(key) ? url.searchParams.getAll(key) : undefined];
		})
	);
	const parseResult = querySchema.safeParse(raw);

	if (!parseResult.success) {
		error(400, { message: parseResult.error.message });
	}

	return {
		...parseResult.data,
		categoryMatch: parseResult.data.categoryMatch[0] ?? 'all',
		contextGuid: parseResult.data.contextGuid[0],
		sort: parseResult.data.sort[0] ?? 'alpha',
		template: parseResult.data.template[0],
		terms: parseResult.data.terms[0] ?? ''
	};
}

function mapToRecord(
	map: Map<string, Map<string, number>>
): Record<string, Record<string, number>> {
	return Object.fromEntries(
		Array.from(map.entries()).map(([key, values]) => [key, Object.fromEntries(values)])
	);
}

function baseFacetMap(
	counts: Record<string, Record<string, number>> = {},
	categoryContext: CategoryContext
) {
	const facets = new Map<string, Map<string, number>>([
		[
			'administrativeType',
			fromCounts(administrativeTypes.options as string[], counts.administrativeType)
		],
		['federalState', fromCounts(Object.keys(counts.federalState ?? {}), counts.federalState)],
		['programType', fromCounts(programTypes.options as string[], counts.programType)],
		[
			'indicatorCategory',
			fromCounts(indicatorCategories.options as string[], counts.indicatorCategory)
		],
		['indicatorType', fromCounts(indicatorTypes.options as string[], counts.indicatorType)],
		[
			'resourceCategory',
			fromCounts(resourceCategories.options as string[], counts.resourceCategory)
		],
		['resourceUnit', fromCounts(resourceUnits.options as string[], counts.resourceUnit)],
		['taskCategory', fromCounts(taskCategories.options as string[], counts.taskCategory)],
		['type', fromCounts(payloadTypes.options as string[], counts.type)]
	]);

	for (const [key, values] of buildCategoryFacetsWithCounts(
		categoryContext.options,
		counts
	).entries()) {
		facets.set(key, values);
	}

	return facets;
}

function buildFilters(
	params: ContainerQueryParams,
	customCategories: Record<string, string[]>,
	overrides: { organizationalUnits?: string[] | null } = {}
) {
	return {
		administrativeTypes: params.administrativeType,
		assignees: params.assignee,
		customCategories,
		customCategoryMatch: params.categoryMatch,
		excludeRelation: params.excludeRelation,
		federalStates: params.federalState,
		goalStatuses: params.goalStatus,
		guid: params.guid,
		hierarchyLevels: params.hierarchyLevel,
		indicators: params.indicator,
		indicatorCategories: params.indicatorCategory,
		indicatorTypes: params.indicatorType,
		levels: params.level,
		members: params.member,
		organizationalUnits:
			'organizationalUnits' in overrides
				? overrides.organizationalUnits
				: params.organizationalUnit,
		programStatuses: params.programStatus,
		programTypes: params.programType,
		resource: params.resource,
		resourceCategories: params.resourceCategory,
		ruleStatuses: params.ruleStatus,
		statuses: params.status,
		taskCategories: params.taskCategory,
		taskStatuses: params.taskStatus,
		template: params.template,
		terms: params.terms,
		type: params.type
	};
}

function canUseElasticsearch(params: ContainerQueryParams) {
	return (
		params.relatedTo.length === 0 &&
		params.excludeRelation.length === 0 &&
		params.indicator.length === 0 &&
		params.member.length === 0 &&
		params.resource.length === 0
	);
}

function paginate(containers: AnyContainer[], limit: number, offset: number, total: number) {
	const hasMore = offset + limit < total;
	return {
		containers: containers.slice(offset, offset + limit),
		page: {
			limit,
			offset,
			total,
			hasMore,
			nextOffset: hasMore ? offset + limit : null
		}
	};
}

async function loadCategoryContextForQuery(
	params: ContainerQueryParams,
	connect: Connect,
	user: User
) {
	const organizations = await connect(getManyOrganizationContainers({ default: true }, ''));
	return await loadCategoryContext({
		connect,
		scope:
			organizations.length > 0
				? [organizations[0].guid, ...params.organization]
				: params.organization,
		user
	});
}

export async function loadContainerV2(params: {
	locals: App.Locals;
	url: URL;
}): Promise<ContainerV2Response> {
	const query = parseContainerQuery(params.url);
	const applicationContext = query.contextGuid
		? await loadApplicationContext({
				locals: params.locals,
				params: { guid: query.contextGuid },
				url: params.url
			})
		: undefined;
	const organization =
		query.organization === undefined
			? []
			: query.organization.length > 0
				? query.organization
				: applicationContext && !applicationContext.currentOrganization.payload.default
					? [applicationContext.currentOrganization.guid]
					: [];
	const scopedQuery = { ...query, organization };
	const categoryContext =
		applicationContext?.categoryContext ??
		(await loadCategoryContextForQuery(
			scopedQuery,
			params.locals.pool.connect,
			params.locals.user
		));

	const queriedCategoryContext =
		scopedQuery.type.length > 0
			? filterCategoryContext(categoryContext, scopedQuery.type)
			: categoryContext;

	const ouOverrides: { organizationalUnits?: string[] | null } = {};

	if (applicationContext) {
		if (applicationContext.currentOrganizationalUnit) {
			if (scopedQuery.included.includes('subordinate_organizational_units')) {
				ouOverrides.organizationalUnits = [
					applicationContext.currentOrganizationalUnit.guid,
					...findDescendants(
						applicationContext.currentOrganizationalUnit,
						applicationContext.organizationalUnits,
						[predicates.enum['is-part-of']]
					).map(({ guid }) => guid)
				];
			} else {
				ouOverrides.organizationalUnits = [applicationContext.currentOrganizationalUnit.guid];
			}
		} else {
			if (scopedQuery.included.includes('subordinate_organizational_units')) {
				ouOverrides.organizationalUnits = [];
			} else {
				ouOverrides.organizationalUnits = null;
			}
		}
	}

	const useElasticsearch = canUseElasticsearch(scopedQuery);
	const customCategories = extractCustomCategoryFilters(params.url, queriedCategoryContext.keys);

	let rawContainers: AnyContainer[];
	let esFacets: Record<string, Record<string, number>> | undefined;

	if (useElasticsearch) {
		const filters = buildFilters(scopedQuery, customCategories, ouOverrides);
		const result = await getManyContainersWithES(scopedQuery.organization, filters, query.sort, {
			customCategoryKeys: queriedCategoryContext.keys,
			includeFacets: true
		});
		rawContainers = result.containers;
		esFacets = result.facets;
	} else {
		const filters = buildFilters(scopedQuery, customCategories, ouOverrides);
		rawContainers =
			query.relatedTo.length > 0
				? await params.locals.pool.connect(
						getAllRelatedContainers(
							scopedQuery.organization,
							query.relatedTo[0],
							query.relationType,
							{
								...filters,
								organizationalUnits: undefined
							},
							query.sort
						)
					)
				: await params.locals.pool.connect(
						getManyContainers(scopedQuery.organization, filters, query.sort)
					);
	}

	const allVisible = filterVisible(rawContainers, params.locals.user);
	const page = paginate(allVisible, query.limit, query.offset, allVisible.length);
	const facets = esFacets
		? baseFacetMap(esFacets, queriedCategoryContext)
		: computeFacetCount(baseFacetMap({}, queriedCategoryContext), allVisible);

	return {
		containers: page.containers,
		page: page.page,
		facets: mapToRecord(facets)
	};
}
