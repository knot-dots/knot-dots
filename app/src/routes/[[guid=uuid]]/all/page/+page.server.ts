import type { GeoJsonObject } from 'geojson';
import { filterVisible } from '$lib/authorization';
import {
	type IndicatorContainer,
	isMapContainer,
	isOrganizationalUnitContainer,
	payloadTypes,
	predicates
} from '$lib/models';
import {
	getAllContainersRelatedToIndicators,
	getAllRelatedContainers,
	getAllRelatedOrganizationalUnitContainers,
	getManyContainers,
	getManySpatialFeatures
} from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load = (async ({ depends, locals, parent }) => {
	depends('containers');

	const { currentOrganization, currentOrganizationalUnit } = await parent();
	const container = currentOrganizationalUnit ?? currentOrganization;
	let organizationalUnits: string[] = [];

	if (isOrganizationalUnitContainer(container)) {
		const relatedOrganizationalUnits = await locals.pool.connect(
			getAllRelatedOrganizationalUnitContainers(container.guid)
		);
		organizationalUnits = relatedOrganizationalUnits
			.filter(({ payload }) => payload.level > container.payload.level)
			.map(({ guid }) => guid)
			.concat(container.guid);
	}

	const [programs, measures, indicators, sections] = await Promise.all([
		locals.pool.connect(
			getManyContainers(
				'default' in container.payload && container.payload.default ? [] : [container.organization],
				{ organizationalUnits, type: [payloadTypes.enum.program] },
				''
			)
		),
		locals.pool.connect(
			getManyContainers(
				'default' in container.payload && container.payload.default ? [] : [container.organization],
				{
					organizationalUnits,
					type: [payloadTypes.enum.measure, payloadTypes.enum.simple_measure]
				},
				''
			)
		),
		locals.pool.connect(
			getManyContainers(
				[container.organization],
				{ organizationalUnits, type: [payloadTypes.enum.indicator] },
				''
			)
		),
		locals.pool.connect(
			getAllRelatedContainers(
				[container.organization],
				container.guid,
				[predicates.enum['is-section-of']],
				{
					type: [
						payloadTypes.enum.file_collection,
						payloadTypes.enum.indicator_collection,
						payloadTypes.enum.map,
						payloadTypes.enum.measure_collection,
						payloadTypes.enum.administrative_area_basic_data,
						payloadTypes.enum.program_collection,
						payloadTypes.enum.task_collection,
						payloadTypes.enum.text
					]
				},
				''
			)
		)
	]);

	const relatedContainers = await locals.pool.connect(
		getAllContainersRelatedToIndicators(indicators as IndicatorContainer[], { organizationalUnits })
	);

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
		indicators: filterVisible(indicators, locals.user),
		containersRelatedToIndicators: filterVisible(relatedContainers, locals.user),
		measures: filterVisible(measures, locals.user),
		programs: filterVisible(programs, locals.user),
		sections: filterVisible(sections, locals.user),
		spatialFeatures
	};
}) satisfies PageServerLoad;
