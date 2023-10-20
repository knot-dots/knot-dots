import { error } from '@sveltejs/kit';
import { _, unwrapFunctionStore } from 'svelte-i18n';
import { env } from '$env/dynamic/public';
import {
	getAllContainerRevisionsByGuid,
	getAllRelatedInternalObjectives,
	getAllRelatedOrganizationalUnitContainers,
	getContainerByGuid,
	getManyTaskContainers,
	maybePartOf
} from '$lib/server/db';
import { containerOfType, isOrganizationalUnitContainer, predicates } from '$lib/models';
import type { AnyContainer, PayloadType } from '$lib/models';
import { filterVisible } from '$lib/authorization';
import type { PageServerLoad } from './$types';

export const load = (async ({ locals, params, url }) => {
	const container = await locals.pool.connect(getContainerByGuid(params.guid));
	let organizationalUnits: string[] = [];
	let overlayData;

	if (!isOrganizationalUnitContainer(container)) {
		throw error(404, unwrapFunctionStore(_)('error.not_found'));
	}

	const relatedOrganizationalUnits = await locals.pool.connect(
		getAllRelatedOrganizationalUnitContainers(container.guid)
	);
	organizationalUnits = relatedOrganizationalUnits
		.filter(({ payload }) => payload.level >= container.payload.level)
		.map(({ guid }) => guid);

	let containers = await locals.pool.connect(
		getManyTaskContainers({
			organizationalUnits,
			taskCategories: url.searchParams.getAll('taskCategory'),
			terms: url.searchParams.get('terms') ?? ''
		})
	);

	containers = containers.filter(({ relation, organizational_unit }) => {
		if (
			!url.searchParams.getAll('included').includes('is-part-of-measure') &&
			relation.some(({ predicate }) => predicate == predicates.enum['is-part-of-measure'])
		) {
			return false;
		}

		if (
			!url.searchParams.getAll('included').includes('subordinate-organizational-units') &&
			organizational_unit != container.guid
		) {
			return false;
		}

		return true;
	});

	if (url.searchParams.has('container-preview')) {
		const guid = url.searchParams.get('container-preview') ?? '';
		const revisions = await locals.pool.connect(getAllContainerRevisionsByGuid(guid));
		const container = revisions[revisions.length - 1];
		const [isPartOfOptions, relatedContainers] = await Promise.all([
			locals.pool.connect(
				maybePartOf(container.organizational_unit ?? container.organization, container.payload.type)
			),
			locals.pool.connect(
				getAllRelatedInternalObjectives(guid, ['hierarchical'], url.searchParams.get('sort') ?? '')
			)
		]);
		overlayData = {
			isPartOfOptions: filterVisible(isPartOfOptions, locals.user),
			relatedContainers: filterVisible(relatedContainers, locals.user),
			revisions
		};
	} else if (url.searchParams.has('overlay-new')) {
		const emptyContainer = containerOfType(
			url.searchParams.get('overlay-new') as PayloadType,
			container.organization,
			container.guid,
			env.PUBLIC_KC_REALM
		);
		const isPartOfOptions = await locals.pool.connect(
			maybePartOf(container.guid, emptyContainer.payload.type)
		);
		overlayData = {
			isPartOfOptions: filterVisible(isPartOfOptions, locals.user),
			relatedContainers: [],
			revisions: [emptyContainer] as AnyContainer[]
		};
	}

	return { container, containers: filterVisible(containers, locals.user), overlayData };
}) satisfies PageServerLoad;
