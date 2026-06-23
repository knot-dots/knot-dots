import type { GeoJsonObject } from 'geojson';
import { filterVisible } from '$lib/authorization';
import {
	isMapContainer,
	isOrganizationalUnitContainer,
	payloadTypes,
	predicates
} from '$lib/models';
import {
	getAllRelatedContainers,
	getAllRelatedOrganizationalUnitContainers,
	getManyContainers,
	getRelatedOrganizationalUnitContainersByPredicates,
	getManySpatialFeatures
} from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load = (async ({ locals, parent }) => {
	const { currentOrganization, currentOrganizationalUnit } = await parent();
	const container = currentOrganizationalUnit ?? currentOrganization;
	let organizationalUnits: string[] = [];
	const visibleGuids = new Set(locals.user.visibleContainerGuids);
	const grantVisible = <T extends { guid: string }>(containers: T[]) =>
		containers.filter(({ guid }) => visibleGuids.has(guid));

	if (isOrganizationalUnitContainer(container)) {
		const relatedOrganizationalUnits = await locals.pool.connect(
			getAllRelatedOrganizationalUnitContainers(container.guid)
		);
		organizationalUnits = relatedOrganizationalUnits
			.filter(({ payload }) => payload.level > container.payload.level)
			.map(({ guid }) => guid)
			.concat(container.guid);
	}

	const [containers, actualData, sections, linkedProfiles] = await Promise.all([
		locals.pool.connect(
			getManyContainers(
				[container.organization],
				{
					organizationalUnits,
					type: [
						payloadTypes.enum.effect,
						payloadTypes.enum.goal,
						payloadTypes.enum.indicator_template,
						payloadTypes.enum.measure,
						payloadTypes.enum.objective,
						payloadTypes.enum.program,
						payloadTypes.enum.simple_measure
					]
				},
				'alpha'
			)
		),
		locals.pool.connect(
			getManyContainers(
				[container.organization],
				{
					organizationalUnits: currentOrganizationalUnit ? [currentOrganizationalUnit.guid] : null,
					type: [payloadTypes.enum.actual_data]
				},
				'alpha'
			)
		),
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
		linkedProfiles: grantVisible(filterVisible(linkedProfiles, locals.user)),
		relatedContainers: grantVisible(filterVisible([...containers, ...actualData, ...sections], locals.user)),
		spatialFeatures
	};
}) satisfies PageServerLoad;
