import { error, json, type RequestHandler } from '@sveltejs/kit';
import loadAll from '$lib/load/all';
import loadGoals from '$lib/load/goals';
import loadIndicators from '$lib/load/indicators';
import loadKnowledge from '$lib/load/knowledge';
import loadMeasures from '$lib/load/measures';
import loadPrograms from '$lib/load/programs';
import loadResources from '$lib/load/resources';
import loadRules from '$lib/load/rules';
import loadTasks from '$lib/load/tasks';
import {
	isOrganizationalUnitContainer,
	isOrganizationContainer,
	payloadTypes,
	type OrganizationContainer,
	type OrganizationalUnitContainer,
	type PayloadType
} from '$lib/models';
import { getContainerByGuid, getManyOrganizationContainers } from '$lib/server/db';

type ParentData = {
	currentOrganization: OrganizationContainer;
	currentOrganizationalUnit: OrganizationalUnitContainer | null;
	defaultOrganizationGuid: string | null;
};

async function resolveParentData(locals: App.Locals, url: URL): Promise<ParentData> {
	const organizationGuid = url.searchParams.get('organizationGuid');
	const organizationalUnitGuid = url.searchParams.get('organizationalUnitGuid');

	const organizations = (await locals.pool.connect(
		getManyOrganizationContainers({}, 'alpha')
	)) as OrganizationContainer[];
	const defaultOrganizationGuid =
		organizations.find(({ payload }) => payload.default)?.guid ?? null;

	let currentOrganization: OrganizationContainer | undefined;
	if (organizationGuid) {
		const container = (await locals.pool.connect(
			getContainerByGuid(organizationGuid)
		)) as OrganizationContainer;
		if (!isOrganizationContainer(container)) {
			error(400, { message: 'Invalid organizationGuid' });
		}
		currentOrganization = container;
	} else if (defaultOrganizationGuid) {
		currentOrganization = organizations.find(({ guid }) => guid === defaultOrganizationGuid);
	}

	if (!currentOrganization) {
		error(400, { message: 'Organization not found' });
	}

	let currentOrganizationalUnit: OrganizationalUnitContainer | null = null;
	if (organizationalUnitGuid) {
		const container = (await locals.pool.connect(
			getContainerByGuid(organizationalUnitGuid)
		)) as OrganizationalUnitContainer;
		if (!isOrganizationalUnitContainer(container)) {
			error(400, { message: 'Invalid organizationalUnitGuid' });
		}
		currentOrganizationalUnit = container;
	}

	return { currentOrganization, currentOrganizationalUnit, defaultOrganizationGuid };
}

function pickLoader(payloadTypeValues: string[]) {
	const unique = Array.from(new Set(payloadTypeValues.filter(Boolean)));
	if (unique.length !== 1) return loadAll;

	switch (unique[0] as PayloadType) {
		case payloadTypes.enum.goal:
			return loadGoals;
		case payloadTypes.enum.program:
			return loadPrograms;
		case payloadTypes.enum.measure:
		case payloadTypes.enum.simple_measure:
			return loadMeasures;
		case payloadTypes.enum.task:
			return loadTasks('alpha');
		case payloadTypes.enum.rule:
			return loadRules;
		case payloadTypes.enum.resource_v2:
			return loadResources;
		case payloadTypes.enum.knowledge:
			return loadKnowledge;
		case payloadTypes.enum.indicator:
		case payloadTypes.enum.indicator_template:
			return loadIndicators;
		default:
			return loadAll;
	}
}

type LoaderInput = {
	depends: (deps: string) => void;
	locals: App.Locals;
	parent: () => Promise<ParentData>;
	url: URL;
};

type LoaderResult = {
	containers?: unknown[];
	facets?: Map<string, Map<string, number>>;
	facetLabels?: Map<string, string>;
	categoryOptions?: Record<string, unknown> | null;
};

export const GET: RequestHandler = async ({ locals, url }) => {
	const loaderUrl = new URL(url);
	loaderUrl.searchParams.delete('organizationGuid');
	loaderUrl.searchParams.delete('organizationalUnitGuid');

	const payloadTypeValues = loaderUrl.searchParams.getAll('payloadType');
	const loader = pickLoader(payloadTypeValues) as unknown as (
		input: LoaderInput
	) => Promise<LoaderResult>;

	const parent = async () => resolveParentData(locals, url);
	const data = await loader({
		depends: () => undefined,
		locals,
		parent,
		url: loaderUrl
	});

	return json({
		containers: data.containers ?? [],
		facets: data.facets
			? Object.fromEntries(
					Array.from(data.facets.entries()).map(([key, values]) => [
						key,
						Object.fromEntries(values)
					])
				)
			: undefined,
		facetLabels: data.facetLabels ? Object.fromEntries(data.facetLabels) : undefined,
		categoryOptions: data.categoryOptions ?? null
	});
};
