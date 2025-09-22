import {
	administrativeAreaBasicDataContainer,
	administrativeAreaWegweiserKommune,
	createContainer,
	createRelation,
	getAdministrativeAreaBBSR,
	getAdministrativeAreaOpenStreetMap,
	getAdministrativeAreaWikidata,
	getContainer,
	getPool,
	insertIntoAdministrativeAreaWegweiserKommune,
	Json,
	mapContainer,
	organizationalUnitContainer,
	updateContainer
} from './db';
import assert from 'node:assert';
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

const envSchema = z
	.object({
		IMPORT_MAX: z.coerce.number().int().positive().default(10000),
		IMPORT_ORGANIZATION: z.string().uuid(),
		IMPORT_ORGANIZATIONAL_UNIT: z.string().uuid().nullable().default(null),
		IMPORT_ORGANIZATIONAL_UNIT_LEVEL: z.coerce.number().int().positive().default(1),
		IMPORT_TYPES: z
			.string()
			.transform((value) => value.split(','))
			.pipe(regionType.array())
			.default('KREISFREIE_STADT,LANDKREIS,GEMEINDE'),
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
							managed_by: organization,
							organization: organization,
							organizational_unit: null,
							payload: {
								administrativeType: administrativeTypeFromRegionType.get(region.type),
								...(bbsr
									? { cityAndMunicipalityTypeBBSR: bbsr.city_and_municipality_type }
									: undefined),
								federalState: stateFromAGS.get(region.official_municipality_key.substring(0, 2)),
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
										newOrganizationalUnitContainer.payload.officialRegionalCode ?? ''
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
										`updated ${region.title} (${updatedOrganizationalUnitContainer.guid})`
									);
								}

								console.log(`ignored ${region.title} (${foundOrganizationalUnitContainer.guid})`);

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
								payload: { geometry: osm?.boundary },
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

							console.log(`created ${region.title} (${savedOrganizationalUnitContainer.guid})`);
						});
					} catch (error) {
						console.error(`failed to save ${region.title}`, error);
					}
				}
			},
			error: (err) => {
				console.error(err);
			}
		});
})();
