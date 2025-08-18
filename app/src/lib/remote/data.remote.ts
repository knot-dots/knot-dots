import { env } from '$env/dynamic/public';
import { getRequestEvent, query } from '$app/server';
import {
	getAllContainersRelatedToIndicators,
	getAllContainersRelatedToMeasure,
	getAllContainersRelatedToProgram,
	getAllRelatedContainers,
	getAllRelatedOrganizationalUnitContainers,
	getContainerByGuid,
	getManyOrganizationalUnitContainers,
	getManyOrganizationContainers,
	setUp
} from '$lib/server/db';
import { filterVisible } from '$lib/authorization';
import {
	type AnyContainer,
	isIndicatorContainer,
	type OrganizationalUnitContainer,
	type OrganizationContainer
} from '$lib/models';
import { error } from '@sveltejs/kit';
import { _, unwrapFunctionStore } from 'svelte-i18n';

export const fetchContainersRelatedToIndicators = query('unchecked', async ({ guid, params }) => {
	const { locals, url } = getRequestEvent();

	let relatedContainers;

	const container = await locals.pool.connect(getContainerByGuid(guid));

	if (!isIndicatorContainer(container)) {
		error(404, unwrapFunctionStore(_)('error.not_found'));
	}

	if (params.program) {
		const [containersRelatedToProgram, containersRelatedToIndicator] = await Promise.all([
			locals.pool.connect(getAllContainersRelatedToProgram(params.program, {})),
			locals.pool.connect(getAllContainersRelatedToIndicators([container], {}))
		]);

		relatedContainers = containersRelatedToProgram.filter(({ guid }) =>
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
			currentOrganization = organizations.find(({ guid }) => url.hostname.startsWith(`${guid}.`));
		}

		if (!currentOrganization) {
			currentOrganizationalUnit = organizationalUnits.find(({ guid }) =>
				url.hostname.startsWith(`${guid}.`)
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

		relatedContainers = await locals.pool.connect(
			getAllContainersRelatedToIndicators([container], {
				organizationalUnits: subordinateOrganizationalUnits
			})
		);
	}

	return filterVisible(relatedContainers, locals.user);
});

export const fetchContainersRelatedToMeasure = query('unchecked', async ({ guid, params }) => {
	const { locals } = getRequestEvent();
	const relatedContainers = await locals.pool.connect(
		getAllContainersRelatedToMeasure(guid, {}, 'alpha')
	);
	return filterVisible(relatedContainers, locals.user);
});

export const fetchContainersRelatedToProgram = query('unchecked', async ({ guid, params }) => {
	const { locals } = getRequestEvent();
	const relatedContainers = await locals.pool.connect(
		getAllContainersRelatedToProgram(guid, {
			audience: params.audience,
			categories: params.category,
			policyFieldsBNK: params.policyFieldBNK,
			...(params.terms ? { terms: params.terms } : undefined),
			topics: params.topic
		})
	);
	return filterVisible(relatedContainers, locals.user);
});

export const fetchRelatedContainers = query('unchecked', async ({ guid, params }) => {
	const { locals } = getRequestEvent();
	const relatedContainers = await locals.pool.connect(
		getAllRelatedContainers(params.organization, guid, params.relationType, {}, 'alpha')
	);
	return filterVisible(relatedContainers, locals.user);
});
