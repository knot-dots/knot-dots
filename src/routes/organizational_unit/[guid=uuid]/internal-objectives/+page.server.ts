import { error } from '@sveltejs/kit';
import { _, unwrapFunctionStore } from 'svelte-i18n';
import { filterVisible } from '$lib/authorization';
import { isOrganizationalUnitContainer, owners, payloadTypes, predicates } from '$lib/models';
import type { OrganizationalUnitContainer } from '$lib/models';
import {
	getAllContainerRevisionsByGuid,
	getAllRelatedInternalObjectives,
	getAllRelatedOrganizationalUnitContainers,
	getContainerByGuid,
	getManyContainers,
	maybePartOf
} from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load = (async ({ locals, params, url }) => {
	const container = await locals.pool.connect(getContainerByGuid(params.guid));
	let containers;
	let overlayData;
	let relationOverlayData;

	if (!isOrganizationalUnitContainer(container)) {
		throw error(404, unwrapFunctionStore(_)('error.not_found'));
	}

	if (url.searchParams.has('related-to')) {
		containers = await locals.pool.connect(
			getAllRelatedInternalObjectives(
				url.searchParams.get('related-to') as string,
				url.searchParams.getAll('relations').length == 0
					? ['hierarchical', 'other']
					: url.searchParams.getAll('relations'),
				''
			)
		);
	} else {
		containers = await locals.pool.connect(
			getManyContainers(
				[container.organization],
				{
					terms: url.searchParams.get('terms') ?? '',
					type: [
						payloadTypes.enum['internal_objective.internal_strategy'],
						payloadTypes.enum['internal_objective.milestone'],
						payloadTypes.enum['internal_objective.strategic_goal'],
						payloadTypes.enum['internal_objective.task'],
						payloadTypes.enum['internal_objective.vision']
					]
				},
				url.searchParams.get('sort') ?? ''
			)
		);
	}

	const relatedOrganizationalUnits = await locals.pool.connect(
		getAllRelatedOrganizationalUnitContainers(container.guid)
	);

	containers = containers.filter((c) => {
		if (
			!url.searchParams.getAll('included').includes('is-part-of-measure') &&
			c.relation.some(({ predicate }) => predicate == predicates.enum['is-part-of-measure'])
		) {
			return false;
		}

		if (
			c.organizational_unit != null &&
			!relatedOrganizationalUnits.map(({ guid }) => guid).includes(c.organizational_unit)
		) {
			return false;
		}

		if (
			!url.searchParams.getAll('included').includes('superordinate-organizational-units') &&
			owners<OrganizationalUnitContainer>(c, relatedOrganizationalUnits).filter(
				({ payload }) => payload.level >= container.payload.level
			).length == 0
		) {
			return false;
		}

		if (
			!url.searchParams.getAll('included').includes('subordinate-organizational-units') &&
			c.organizational_unit != null &&
			owners<OrganizationalUnitContainer>(c, relatedOrganizationalUnits).filter(
				({ payload }) => payload.level <= container.payload.level
			).length == 0
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
			locals.pool.connect(getAllRelatedInternalObjectives(guid, ['hierarchical'], ''))
		]);
		overlayData = {
			isPartOfOptions: filterVisible(isPartOfOptions, locals.user),
			relatedContainers: filterVisible(relatedContainers, locals.user),
			revisions
		};
	} else if (url.searchParams.has('container-relations')) {
		const guid = url.searchParams.get('container-relations') ?? '';
		const revisions = await locals.pool.connect(getAllContainerRevisionsByGuid(guid));
		const container = revisions[revisions.length - 1];
		relationOverlayData = { object: container };
	}

	return {
		container,
		containers: filterVisible(containers, locals.user),
		overlayData,
		relationOverlayData
	};
}) satisfies PageServerLoad;
