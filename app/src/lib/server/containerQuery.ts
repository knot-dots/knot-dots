import { error } from '@sveltejs/kit';
import { z } from 'zod';
import { filterVisible } from '$lib/authorization';
import {
	buildCategoryFacetsWithCounts,
	type CategoryOptions,
	type CategoryContext
} from '$lib/categoryOptions';
import { createFeatureDecisions } from '$lib/features';
import {
	administrativeTypes,
	type AnyContainer,
	audience,
	computeFacetCount,
	fromCounts,
	indicatorCategories,
	indicatorTypes,
	measureTypes,
	payloadTypes,
	policyFieldBNK,
	predicates,
	programTypes,
	resourceCategories,
	resourceUnits,
	sustainableDevelopmentGoals,
	taskCategories,
	topics
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
		hasMore: boolean;
		nextOffset: number | null;
	};
	facets: Record<string, Record<string, number>>;
	facetLabels?: Record<string, string>;
	categoryOptions?: CategoryOptions | null;
};

const querySchema = z.object({
	administrativeType: z.array(administrativeTypes).default([]),
	assignee: z.array(z.string().uuid()).default([]),
	audience: z.array(audience).catch([]).default([]),
	categoryMatch: z.array(z.enum(['any', 'all'])).default(['all']),
	contextGuid: z.array(z.string().uuid()).default([]),
	federalState: z.array(z.string()).default([]),
	guid: z.array(z.string().uuid()).default([]),
	indicator: z.array(z.string().uuid()).default([]),
	indicatorCategory: z.array(indicatorCategories).default([]),
	indicatorType: z.array(indicatorTypes).default([]),
	limit: z.coerce.number().int().positive().max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
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
	policyFieldBNK: z.array(policyFieldBNK).catch([]).default([]),
	programType: z.array(programTypes).default([]),
	relatedTo: z.array(z.string().uuid()).default([]),
	relationType: z.array(predicates).default([predicates.enum['is-part-of']]),
	resource: z.array(z.string()).default([]),
	resourceCategory: z.array(resourceCategories).default([]),
	sdg: z.array(sustainableDevelopmentGoals).catch([]).default([]),
	sort: z.array(z.enum(['alpha', 'modified', 'priority'])).default(['alpha']),
	taskCategory: z.array(taskCategories).default([]),
	template: z.array(z.stringbool()).default([]),
	terms: z.array(z.string()).default([]),
	topic: z.array(topics).catch([]).default([])
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

function categoryLabelsToRecord(labels?: Map<string, string>): Record<string, string> | undefined {
	if (!labels) return undefined;
	return Object.fromEntries(labels);
}

function baseFacetMap(
	counts: Record<string, Record<string, number>> = {},
	categoryContext?: CategoryContext
) {
	const facets = new Map<string, Map<string, number>>([
		['audience', fromCounts(audience.options as string[], counts.audience)],
		['sdg', fromCounts(sustainableDevelopmentGoals.options as string[], counts.sdg)],
		['topic', fromCounts(topics.options as string[], counts.topic)],
		['policyFieldBNK', fromCounts(policyFieldBNK.options as string[], counts.policyFieldBNK)],
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

	if (categoryContext) {
		for (const [key, values] of buildCategoryFacetsWithCounts(
			categoryContext.options,
			counts
		).entries()) {
			facets.set(key, values);
		}
	}

	return facets;
}

function buildFilters(params: ContainerQueryParams, customCategories: Record<string, string[]>) {
	return {
		administrativeTypes: params.administrativeType,
		assignees: params.assignee,
		audience: customCategories['audience'] ? [] : params.audience,
		customCategories,
		customCategoryMatch: params.categoryMatch,
		federalStates: params.federalState,
		guid: params.guid,
		indicators: params.indicator,
		indicatorCategories: params.indicatorCategory,
		indicatorTypes: params.indicatorType,
		organizationalUnits: params.organizationalUnit,
		policyFieldsBNK: customCategories['policyFieldBNK'] ? [] : params.policyFieldBNK,
		programTypes: params.programType,
		resource: params.resource,
		resourceCategories: params.resourceCategory,
		sdg: customCategories['sdg'] ? [] : params.sdg,
		taskCategories: params.taskCategory,
		template: params.template,
		terms: params.terms,
		topics: customCategories['topic'] ? [] : params.topic,
		type: params.payloadType
	};
}

function buildElasticsearchFilters(
	params: ContainerQueryParams,
	customCategories: Record<string, string[]>
) {
	return {
		assignees: params.assignee,
		audience: customCategories['audience'] ? [] : params.audience,
		customCategories,
		indicatorCategories: params.indicatorCategory,
		indicatorTypes: params.indicatorType,
		organizationalUnits: params.organizationalUnit ?? undefined,
		policyFieldsBNK: customCategories['policyFieldBNK'] ? [] : params.policyFieldBNK,
		programTypes: params.programType,
		resourceCategories: params.resourceCategory,
		sdg: customCategories['sdg'] ? [] : params.sdg,
		taskCategories: params.taskCategory,
		template: params.template,
		terms: params.terms,
		topics: customCategories['topic'] ? [] : params.topic,
		type: params.payloadType
	};
}

function canUseElasticsearch(params: ContainerQueryParams) {
	return (
		params.relatedTo.length === 0 &&
		params.administrativeType.length === 0 &&
		params.federalState.length === 0 &&
		params.guid.length === 0 &&
		params.indicator.length === 0 &&
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

export async function loadContainerV2(params: {
	locals: App.Locals;
	url: URL;
}): Promise<ContainerV2Response> {
	const query = parseContainerQuery(params.url);
	const features = createFeatureDecisions(params.locals.features);
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
	const categoryContext = features.useCustomCategories()
		? (applicationContext?.categoryContext ??
			(await loadCategoryContextForQuery(
				scopedQuery,
				params.locals.pool.connect,
				params.locals.user
			)))
		: undefined;
	const customCategories = features.useCustomCategories()
		? extractCustomCategoryFilters(params.url, categoryContext?.keys ?? [])
		: {};
	const useElasticsearch = features.useElasticsearch() && canUseElasticsearch(scopedQuery);
	const requestedLimit = query.limit + 1;

	if (useElasticsearch) {
		const result = await getManyContainersWithES(
			scopedQuery.organization,
			buildElasticsearchFilters(scopedQuery, customCategories),
			query.sort,
			{
				customCategoryKeys: categoryContext?.keys ?? [],
				includeFacets: true,
				limit: requestedLimit,
				offset: query.offset
			}
		);
		const page = paginate(result.containers, query.limit, query.offset);
		const containers = filterVisible(page.containers, params.locals.user);
		return {
			containers,
			page: page.page,
			facets: mapToRecord(baseFacetMap(result.facets, categoryContext)),
			facetLabels: categoryLabelsToRecord(categoryContext?.labels),
			categoryOptions: categoryContext?.options
		};
	}

	const filters = buildFilters(scopedQuery, customCategories);
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
	const facets = computeFacetCount(baseFacetMap({}, categoryContext), containers, {
		useCategoryPayload: features.useCustomCategories()
	});

	return {
		containers,
		page: page.page,
		facets: mapToRecord(facets),
		facetLabels: categoryLabelsToRecord(categoryContext?.labels),
		categoryOptions: categoryContext?.options
	};
}
