import {
	administrativeAreaBasicDataContainer,
	administrativeAreaWegweiserKommune,
	createContainer,
	createRelation,
	getAdministrativeAreaBBSR,
	getAdministrativeAreaOpenStreetMap,
	getAdministrativeAreaOpenStreetMapByRelationId,
	getAdministrativeAreaWikidata,
	getAdministrativeAreaWikidataByRegionalCode,
	getContainer,
	getPool,
	insertIntoAdministrativeAreaWegweiserKommune,
	Json,
	mapContainer,
	organizationalUnitContainer,
	updateContainer
} from './db.ts';
import assert from 'node:assert';
import { fromFetch } from 'rxjs/fetch';
import { map, mergeMap, tap } from 'rxjs/operators';
import { DatabaseTransactionConnection } from 'slonik';
import * as z from 'zod';

const regionType = z.enum([
	'BUND',
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
	['BUND', 'administrative_type.country'],
	['BUNDESLAND', 'administrative_type.federal_state'],
	['LANDKREIS', 'administrative_type.rural_district'],
	['KREISFREIE_STADT', 'administrative_type.urban_district'],
	['GEMEINDE', 'administrative_type.municipality']
]);

// Hamburg (02), Bremen (04), Berlin (11) are city-states: simultaneously
// a federal state and an urban district. However Bremen has also a federal state entry in Wegweiser,
// so only Berlin and Hamburg are stored as KREISFREIE_STADT in Wegweiser. For these two, we want to assign both.
const cityStatePrefixes = new Set(['02', '11']);

function getAdministrativeTypes(regionType: string, officialMunicipalityKey: string): string[] {
	const primary = administrativeTypeFromRegionType.get(regionType);
	if (!primary) return [];
	if (
		regionType === 'KREISFREIE_STADT' &&
		cityStatePrefixes.has(officialMunicipalityKey.substring(0, 2))
	) {
		return [primary, 'administrative_type.federal_state'];
	}
	return [primary];
}

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

const envSchema = z
	.object({
		IMPORT_MAX: z.coerce.number().int().positive().default(10000),
		IMPORT_ORGANIZATION: z.string().uuid(),
		IMPORT_ORGANIZATIONAL_UNIT: z.string().uuid().nullable().default(null),
		IMPORT_ORGANIZATIONAL_UNIT_LEVEL: z.coerce.number().int().positive().default(1),
		IMPORT_TYPES: z
			.string()
			.default('BUND,BUNDESLAND,KREISFREIE_STADT,LANDKREIS,GEMEINDE')
			.transform((value) => value.split(','))
			.pipe(regionType.array()),
		IMPORT_USER: z.string().uuid(),
		PUBLIC_KC_REALM: z.string().default('knot-dots')
	})
	.transform((value) => ({
		max: value.IMPORT_MAX,
		organization: value.IMPORT_ORGANIZATION,
		organizationalUnit: value.IMPORT_ORGANIZATIONAL_UNIT,
		organizationalUnitLevel: value.IMPORT_ORGANIZATIONAL_UNIT_LEVEL,
		realm: value.PUBLIC_KC_REALM,
		types: value.IMPORT_TYPES,
		user: value.IMPORT_USER
	}));

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

function isSame<T>(a: T, b: T) {
	try {
		assert.deepEqual(a, b);
		return true;
	} catch (_) {
		return false;
	}
}

(function main() {
	const { max, organization, organizationalUnit, organizationalUnitLevel, realm, types, user } =
		envSchema.parse(process.env);

	fetchRegion$({ max, types })
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
			tap((regions) => console.log(`Fetched ${regions.length} regions from Wegweiser Kommune`))
		)
		.subscribe({
			next: async (regions) => {
				const pool = await getPool();

				await pool.query(insertIntoAdministrativeAreaWegweiserKommune(regions as Json));

				for (const region of regions) {
					try {
						let osm = await pool.maybeOne(
							getAdministrativeAreaOpenStreetMap(region.official_regional_code)
						);

						const bbsr = await pool.maybeOne(
							getAdministrativeAreaBBSR(region.official_regional_code)
						);

						// For BUND, look up Germany directly by its stable Wikidata ID (Q183).
						// For other types without an OSM entry (e.g. BUNDESLAND whose OSM
						// relations carry no de:regionalschluessel tag), fall back to a
						// regional-code lookup in the Wikidata table.
						const wikidata = osm?.wikidata_id
							? await pool.maybeOne(getAdministrativeAreaWikidata(osm.wikidata_id))
							: region.type === 'BUND'
								? await pool.maybeOne(getAdministrativeAreaWikidata('Q183'))
								: await pool.maybeOne(
										getAdministrativeAreaWikidataByRegionalCode(region.official_regional_code)
									);

						// When OSM wasn't found by regional code (e.g. Germany and federal
						// states don't carry de:regionalschluessel), derive it from the
						// OSM relation ID stored in the Wikidata entry.
						if (!osm && wikidata?.open_street_map_relation_id) {
							osm = await pool.maybeOne(
								getAdministrativeAreaOpenStreetMapByRelationId(wikidata.open_street_map_relation_id)
							);
						}

						const newOrganizationalUnitContainer = organizationalUnitContainer.parse({
							managed_by: organization,
							organization: organization,
							organizational_unit: null,
							payload: {
								administrativeType: getAdministrativeTypes(
									region.type,
									region.official_municipality_key
								),
								...(bbsr
									? { cityAndMunicipalityTypeBBSR: bbsr.city_and_municipality_type }
									: undefined),
								federalState: stateFromAGS.get(region.official_municipality_key.substring(0, 2)),
								...(osm ? { geometry: osm.boundary, nameOSM: osm?.name } : undefined),
								...(wikidata?.coat_of_arms ? { image: wikidata.coat_of_arms } : undefined),
								level: organizationalUnitLevel,
								name: region.title,
								officialMunicipalityKey: region.official_municipality_key,
								officialRegionalCode: region.official_regional_code
							},
							realm,
							user: [{ predicate: 'is-creator-of', subject: user }]
						});

						await pool.transaction(async (tx: DatabaseTransactionConnection) => {
							const foundOrganizationalUnitContainer = await getContainer({
								organization,
								organizationalUnit: null,
								payload: {
									officialRegionalCode:
										newOrganizationalUnitContainer.payload.officialRegionalCode ?? '',
									organizationalUnitType: 'organizational_unit_type.administrative_area',
									type: 'organizational_unit'
								}
							})(tx);

							if (foundOrganizationalUnitContainer) {
								if (
									!isSame(
										foundOrganizationalUnitContainer.payload,
										newOrganizationalUnitContainer.payload
									)
								) {
									const updatedOrganizationalUnitContainer = await updateContainer({
										...foundOrganizationalUnitContainer,
										payload: newOrganizationalUnitContainer.payload
									})(tx);

									console.log(
										`Updated ${region.title} (${updatedOrganizationalUnitContainer.guid})`
									);
								} else {
									console.log(`Ignored ${region.title} (${foundOrganizationalUnitContainer.guid})`);
								}

								return;
							}

							const savedOrganizationalUnitContainer = await createContainer(
								newOrganizationalUnitContainer
							)(tx);

							const newAdministrativeAreaBasicDataContainer =
								administrativeAreaBasicDataContainer.parse({
									managed_by: savedOrganizationalUnitContainer.guid,
									organization: organization,
									organizational_unit: savedOrganizationalUnitContainer.guid,
									payload: {},
									realm,
									user: [{ predicate: 'is-creator-of', subject: user }]
								});

							const newMapContainer = mapContainer.parse({
								managed_by: savedOrganizationalUnitContainer.guid,
								organization: organization,
								organizational_unit: savedOrganizationalUnitContainer.guid,
								realm,
								user: [{ predicate: 'is-creator-of', subject: user }]
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
								...(organizationalUnit
									? [
											{
												object: organizationalUnit,
												position: 0,
												predicate: 'is-part-of' as 'is-part-of',
												subject: savedOrganizationalUnitContainer.guid
											}
										]
									: [])
							];

							await createRelation(relations)(tx);

							console.log(`Created ${region.title} (${savedOrganizationalUnitContainer.guid})`);
						});
					} catch (error) {
						console.error(`Failed to save ${region.title}`, error);
					}
				}
			},
			error: (err) => {
				console.error(err);
			}
		});
})();
