import type { GeoJsonObject } from 'geojson';
import { filterVisible } from '$lib/authorization';
import { isMapContainer, isOrganizationalUnitContainer, predicates } from '$lib/models';
import {
	getAllRelatedContainers,
	getAllRelatedOrganizationalUnitContainers,
	getRelatedOrganizationalUnitContainersByPredicates,
	getManySpatialFeatures
} from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load = (async ({ locals, parent }) => {
	const { currentOrganization, currentOrganizationalUnit } = await parent();
	const container = currentOrganizationalUnit ?? currentOrganization;

	let relatedOrganizationalUnitGuids: string[] = [];

	if (isOrganizationalUnitContainer(container)) {
		const relatedOrganizationalUnits = await locals.pool.connect(
			getAllRelatedOrganizationalUnitContainers(container.guid)
		);
		relatedOrganizationalUnitGuids = relatedOrganizationalUnits
			.filter(({ payload }) => payload.level > container.payload.level)
			.map(({ guid }) => guid)
			.concat(container.guid);
	}

	const [sections, linkedProfiles] = await Promise.all([
		locals.pool.connect(
			getAllRelatedContainers(
				[container.organization],
				container.guid,
				[predicates.enum['is-section-of']],
				{},
				''
			)
		),
		isOrganizationalUnitContainer(container)
			? locals.pool.connect(
					getRelatedOrganizationalUnitContainersByPredicates(container.guid, [
						predicates.enum['is-individual-profile-of']
					])
				)
			: Promise.resolve([])
	]);

	let spatialFeatures: Array<GeoJsonObject & { id: string }> = [];

	if (sections.filter(isMapContainer).length > 0 || 'geometry' in container.payload) {
		const result = await locals.pool.connect(
			getManySpatialFeatures([
				...('geometry' in container.payload && container.payload.geometry
					? [container.payload.geometry]
					: []),
				...sections
					.filter(isMapContainer)
					.map(({ payload }) => payload.geometry)
					.filter((geom) => geom !== undefined)
			])
		);

		spatialFeatures = result.map(({ geom, guid }) => ({
			geometry: geom,
			id: guid,
			type: 'Feature'
		}));
	}

	return {
		container,
		linkedProfiles: filterVisible(linkedProfiles, locals.user),
		relatedOrganizationalUnitGuids,
		sections: filterVisible(sections, locals.user),
		spatialFeatures
	};
}) satisfies PageServerLoad;
