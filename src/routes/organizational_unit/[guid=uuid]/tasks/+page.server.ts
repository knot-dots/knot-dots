import {
	getAllContainerRevisionsByGuid,
	getAllRelatedInternalObjectives,
	getAllRelatedOrganizationalUnitContainers,
	getContainerByGuid,
	getManyTaskContainers,
	maybePartOf
} from '$lib/server/db';
import type { PageServerLoad } from './$types';
import { isOrganizationalUnitContainer, predicates } from '$lib/models';
import { error } from '@sveltejs/kit';
import { _, unwrapFunctionStore } from 'svelte-i18n';

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
		getManyTaskContainers({ organizationalUnits, terms: url.searchParams.get('terms') ?? '' })
	);

	if (url.searchParams.has('excluded')) {
		containers = containers.filter(({ relation, organizational_unit }) => {
			if (
				url.searchParams.getAll('excluded').includes('is-part-of-measure') &&
				relation.some(({ predicate }) => predicate == predicates.enum['is-part-of-measure'])
			) {
				return false;
			}

			if (
				url.searchParams.getAll('excluded').includes('subordinate-organizational-units') &&
				organizational_unit != container.guid
			) {
				return false;
			}

			return true;
		});
	}

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
		overlayData = { isPartOfOptions, relatedContainers, revisions };
	}

	return { container, containers, overlayData };
}) satisfies PageServerLoad;
