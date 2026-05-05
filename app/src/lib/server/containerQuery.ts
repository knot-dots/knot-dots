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
	fromCounts,
	indicatorCategories,
	indicatorTypes,
	measureTypes,
	type OrganizationalUnitContainer,
	payloadTypes,
	predicates,
	programTypes,
	resourceCategories,
	resourceUnits,
	taskCategories
} from '$lib/models';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '$lib/pagination';
import { loadCategoryContext } from '$lib/server/categoryOptions';
import { loadApplicationContext } from '$lib/server/applicationContext';
import {
	getAllRelatedContainers,
	getAllRelatedOrganizationalUnitContainers,
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
	guid: z.array(z.string().uuid()).default([]),
	indicator: z.array(z.string().uuid()).default([]),
	indicatorCategory: z.array(indicatorCategories).default([]),
	indicatorType: z.array(indicatorTypes).default([]),
	included: z
		.array(z.enum(['subordinate_organizational_units']))
		.default(['subordinate_organizational_units']),
	limit: z.coerce.number().int().positive().max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
	member: z.array(z.string().uuid()).default([]),
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
	resource: z.array(z.string()).default([]),
	resourceCategory: z.array(resourceCategories).default([]),
	sort: z.array(z.enum(['alpha', 'modified', 'priority'])).default(['alpha']),
	taskCategory: z.array(taskCategories).default([]),
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
		['programType', fromCounts(programTypes.options as string[], counts.programType)],
		['measureType', fromCounts(measureTypes.options as string[], counts.measureType)],
		[
			'indicatorCategory',
			fromCounts(indicatorCategories.options as string[], counts.indicatorCategory)
		],
		['indicatorType', fromCounts(indicatorTypes.options as string[], counts.indicatorType)],
		['taskCategory', fromCounts(taskCategories.options as string[], counts.taskCategory)],
		[
			'resourceCategory',
			fromCounts(resourceCategories.options as string[], counts.resourceCategory)
		],
		['resourceUnit', fromCounts(resourceUnits.options as string[], counts.resourceUnit)]
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
		guid: params.guid,
		indicators: params.indicator,
		indicatorCategories: params.indicatorCategory,
		indicatorTypes: params.indicatorType,
		members: params.member,
		organizationalUnits:
			'organizationalUnits' in overrides
				? overrides.organizationalUnits
				: params.organizationalUnit,
		programTypes: params.programType,
		resource: params.resource,
		resourceCategories: params.resourceCategory,
		taskCategories: params.taskCategory,
		template: params.template,
		terms: params.terms,
		type: params.payloadType.length > 0 ? params.payloadType : params.type
	};
}

function buildElasticsearchFilters(
	params: ContainerQueryParams,
	customCategories: Record<string, string[]>
) {
	return {
		assignees: params.assignee,
		customCategories,
		indicatorCategories: params.indicatorCategory,
		indicatorTypes: params.indicatorType,
		organizationalUnits: params.organizationalUnit ?? undefined,
		programTypes: params.programType,
		resourceCategories: params.resourceCategory,
		taskCategories: params.taskCategory,
		template: params.template,
		terms: params.terms,
		type: params.payloadType.length > 0 ? params.payloadType : params.type
	};
}

function canUseElasticsearch(params: ContainerQueryParams) {
	return (
		params.relatedTo.length === 0 &&
		params.administrativeType.length === 0 &&
		params.excludeRelation.length === 0 &&
		params.federalState.length === 0 &&
		params.guid.length === 0 &&
		params.indicator.length === 0 &&
		params.member.length === 0 &&
		params.resource.length === 0 &&
		params.organizationalUnit !== null
	);
}

function paginate(containers: AnyContainer[], limit: number, offset: number) {
	const hasMore = containers.length > limit;
	return {
		containers: containers.slice(0, limit),
		page: {
			limit,
			offset,
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

function expandOrganizationalUnitScope(
	allRelated: OrganizationalUnitContainer[],
	currentOrgUnit: OrganizationalUnitContainer
): { organizationalUnits: string[] } {
	const subordinateGuids = allRelated
		.filter((u) => u.payload.level > currentOrgUnit.payload.level)
		.map((u) => u.guid);

	return { organizationalUnits: [currentOrgUnit.guid, ...subordinateGuids] };
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
		query.organization.length > 0
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

	// Expand organizational unit scope from the context's current org unit, unless the caller
	// explicitly passed organizationalUnit params or the query uses related-to (no ou filtering).
	let ouOverrides: { organizationalUnits?: string[] | null } = {};
	const currentOrgUnit = applicationContext?.currentOrganizationalUnit;
	if (
		currentOrgUnit &&
		scopedQuery.relatedTo.length === 0 &&
		(scopedQuery.organizationalUnit === null || scopedQuery.organizationalUnit.length === 0)
	) {
		const allRelated = await params.locals.pool.connect(
			getAllRelatedOrganizationalUnitContainers(currentOrgUnit.guid)
		);
		ouOverrides = expandOrganizationalUnitScope(allRelated, currentOrgUnit);
	}

	const useElasticsearch = canUseElasticsearch(scopedQuery);
	const requestedLimit = query.limit + 1;
	const customCategories = extractCustomCategoryFilters(params.url, queriedCategoryContext.keys);

	if (useElasticsearch) {
		const esFilters = buildElasticsearchFilters(scopedQuery, customCategories);
		if (ouOverrides.organizationalUnits) {
			esFilters.organizationalUnits = ouOverrides.organizationalUnits;
		}
		const result = await getManyContainersWithES(scopedQuery.organization, esFilters, query.sort, {
			customCategoryKeys: queriedCategoryContext.keys,
			includeFacets: true,
			limit: requestedLimit,
			offset: query.offset
		});
		const page = paginate(result.containers, query.limit, query.offset);
		const containers = filterVisible(page.containers, params.locals.user);
		return {
			containers,
			page: page.page,
			facets: mapToRecord(baseFacetMap(result.facets, queriedCategoryContext))
		};
	}

	const filters = buildFilters(scopedQuery, customCategories, ouOverrides);
	const rawContainers =
		query.relatedTo.length > 0
			? await params.locals.pool.connect(
					getAllRelatedContainers(
						scopedQuery.organization,
						query.relatedTo[0],
						query.relationType,
						{
							...filters,
							organizationalUnits: filters.organizationalUnits ?? undefined
						},
						query.sort,
						requestedLimit,
						query.offset
					)
				)
			: await params.locals.pool.connect(
					getManyContainers(scopedQuery.organization, filters, query.sort, {
						limit: requestedLimit,
						offset: query.offset
					})
				);

	const page = paginate(rawContainers, query.limit, query.offset);
	const containers = filterVisible(page.containers, params.locals.user);
	const facets = computeFacetCount(baseFacetMap({}, queriedCategoryContext), containers);

	return {
		containers,
		page: page.page,
		facets: mapToRecord(facets)
	};
}
