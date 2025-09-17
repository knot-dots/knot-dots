import {
	createContainer,
	createRelation,
	getAdministrativeAreaBBSR,
	getAdministrativeAreaOpenStreetMap,
	getAdministrativeAreaWikidata,
	getPool,
	mapContainer,
	administrativeAreaBasicDataContainer,
	organizationalUnitContainer,
	insertIntoAdministrativeAreaWegweiserKommune,
	Json,
	administrativeAreaWegweiserKommune
} from './db';
import { fromFetch } from 'rxjs/fetch';
import { map, mergeMap, tap } from 'rxjs/operators';
import { DatabaseTransactionConnection } from 'slonik';
import * as z from 'zod';

const regionType = z.enum([
	'BUNDESLAND',
	'REGIERUNGSBEZIRK',
	'LANDKREIS',
	'KREISFREIE_STADT',
	'STADTKREIS',
	'KREIS',
	'VERBANDSGEMEINDE',
	'AMT',
	'GEMEINDE'
]);

const administrativeTypeFromRegionType = new Map([
	['LANDKREIS', 'administrative_type.rural_district'],
	['KREISFREIE_STADT', 'administrative_type.urban_district'],
	['GEMEINDE', 'administrative_type.municipality']
]);

const stateFromAGS = new Map([
	['01', 'Schleswig-Holstein'],
	['02', 'Hamburg'],
	['03', 'Niedersachsen'],
	['04', 'Bremen'],
	['05', 'Nordrhein-Westfalen'],
	['06', 'Hessen'],
	['07', 'Rheinland-Pfalz'],
	['08', 'Baden-Württemberg'],
	['09', 'Bayern'],
	['10', 'Saarland'],
	['11', 'Berlin'],
	['12', 'Brandenburg'],
	['13', 'Mecklenburg-Vorpommern'],
	['14', 'Sachsen'],
	['15', 'Sachsen-Anhalt'],
	['16', 'Thüringen']
]);

type RegionType = z.infer<typeof regionType>;

const region = z
	.object({
		ags: z.string().length(8),
		ars: z.string().min(2).max(12),
		demographicType: z.number().nonnegative(),
		friendlyUrl: z.string(),
		id: z.number().int(),
		name: z.string(),
		parentId: z.number().int().nullable().optional(),
		smallRegionReplacement: z.boolean().optional(),
		title: z.string(),
		type: regionType.or(z.string())
	})
	.passthrough();

type Region = z.infer<typeof region>;

function fetchRegion$(params: { max?: number; types?: RegionType[] }) {
	const url = new URL('https://www.wegweiser-kommune.de/data-api/rest/region/list');

	if (params.max) {
		url.searchParams.set('max', String(params.max));
	}

	if (params.types) {
		for (const type of params.types) {
			url.searchParams.append('types', type);
		}
	}

	return fromFetch(url.toString());
}

fetchRegion$({ max: 10000, types: ['KREISFREIE_STADT', 'LANDKREIS', 'GEMEINDE'] })
	.pipe(
		mergeMap(async (res) => res.json() as Promise<Region[]>),
		map((regions) =>
			regions.map((region) =>
				administrativeAreaWegweiserKommune.parse({
					demographic_type: region.demographicType,
					friendly_url: region.friendlyUrl,
					id: region.id,
					name: region.name,
					official_municipality_key: region.ags,
					official_regional_code: region.ars,
					parent: region.parent,
					small_region_replacement: region.smallRegionReplacement,
					title: region.title,
					type: region.type
				})
			)
		),
		tap((regions) => console.log(`fetched ${regions.length} regions from Wegweiser Kommune`))
	)
	.subscribe({
		next: async (regions) => {
			const pool = await getPool();

			await pool.query(insertIntoAdministrativeAreaWegweiserKommune(regions as Json));

			for (const region of regions) {
				try {
					const osm = await pool.maybeOne(
						getAdministrativeAreaOpenStreetMap(region.official_regional_code)
					);

					const bbsr = await pool.maybeOne(
						getAdministrativeAreaBBSR(region.official_regional_code)
					);

					const wikidata = osm?.wikidata_id
						? await pool.maybeOne(getAdministrativeAreaWikidata(osm.wikidata_id))
						: undefined;

					const newOrganizationalUnitContainer = organizationalUnitContainer.parse({
						managed_by: process.env.IMPORT_ORGANIZATION,
						organization: process.env.IMPORT_ORGANIZATION,
						organizational_unit: null,
						payload: {
							administrativeType: administrativeTypeFromRegionType.get(region.type),
							...(bbsr
								? { cityAndMunicipalityTypeBBSR: bbsr.city_and_municipality_type }
								: undefined),
							federalState: stateFromAGS.get(region.official_municipality_key.substring(0, 2)),
							...(wikidata?.coat_of_arms ? { image: wikidata.coat_of_arms } : undefined),
							level: process.env.IMPORT_ORGANIZATIONAL_UNIT_LEVEL,
							name: region.title,
							officialMunicipalityKey: region.official_municipality_key,
							officialRegionalCode: region.official_regional_code
						},
						realm: process.env.PUBLIC_KC_REALM ?? 'knot-dots',
						user: [
							{
								predicate: 'is-creator-of',
								subject: process.env.IMPORT_USER
							}
						]
					});

					await pool.transaction(async (tx: DatabaseTransactionConnection) => {
						const savedOrganizationalUnitContainer = await createContainer(
							newOrganizationalUnitContainer
						)(tx);

						const newAdministrativeAreaBasicDataContainer =
							administrativeAreaBasicDataContainer.parse({
								managed_by: savedOrganizationalUnitContainer.guid,
								organization: process.env.IMPORT_ORGANIZATION,
								organizational_unit: savedOrganizationalUnitContainer.guid,
								payload: {},
								realm: process.env.PUBLIC_KC_REALM ?? 'knot-dots',
								user: [
									{
										predicate: 'is-creator-of',
										subject: process.env.IMPORT_USER
									}
								]
							});

						const newMapContainer = mapContainer.parse({
							managed_by: savedOrganizationalUnitContainer.guid,
							organization: process.env.IMPORT_ORGANIZATION,
							organizational_unit: savedOrganizationalUnitContainer.guid,
							payload: { geometry: osm?.boundary },
							realm: process.env.PUBLIC_KC_REALM ?? 'knot-dots',
							user: [
								{
									predicate: 'is-creator-of',
									subject: process.env.IMPORT_USER
								}
							]
						});

						const savedAdministrativeAreaBasicDataContainer = await createContainer(
							newAdministrativeAreaBasicDataContainer
						)(tx);

						const savedMapContainer = await createContainer(newMapContainer)(tx);

						const relations = [
							{
								object: savedOrganizationalUnitContainer.guid,
								position: 0,
								predicate: 'is-section-of' as 'is-section-of',
								subject: savedAdministrativeAreaBasicDataContainer.guid
							},
							{
								object: savedOrganizationalUnitContainer.guid,
								position: 1,
								predicate: 'is-section-of' as 'is-section-of',
								subject: savedMapContainer.guid
							},
							...(process.env.IMPORT_ORGANIZATIONAL_UNIT
								? [
										{
											object: process.env.IMPORT_ORGANIZATIONAL_UNIT,
											position: 0,
											predicate: 'is-part-of' as 'is-part-of',
											subject: savedOrganizationalUnitContainer.guid
										}
									]
								: [])
						];

						await createRelation(relations)(tx);

						console.log(`created ${region.title} (${savedOrganizationalUnitContainer.guid})`);
					});
				} catch (error) {
					console.error(`failed to create containers for ${region.title}`, error);
				}
			}
		},
		error: (err) => {
			console.error(err);
		}
	});
