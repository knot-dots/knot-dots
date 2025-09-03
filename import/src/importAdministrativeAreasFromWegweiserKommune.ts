import {
	createContainer,
	createRelation,
	getAdministrativeAreaBBSR,
	getAdministrativeAreaOpenStreetMap,
	getAdministrativeAreaWikidata,
	getPool,
	mapContainer,
	municipalBasicDataContainer,
	organizationalUnitContainer
} from './db';
import { fromFetch } from 'rxjs/fetch';
import { mergeMap, tap } from 'rxjs/operators';
import { DatabasePool, DatabaseTransactionConnection } from 'slonik';
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

let pool: DatabasePool;

getPool().then((p) => (pool = p));

fetchRegion$({ max: 10000, types: ['KREISFREIE_STADT', 'LANDKREIS', 'GEMEINDE'] })
	.pipe(
		mergeMap(async (res) => res.json() as Promise<Region[]>),
		tap((regions) => console.log(`fetched ${regions.length} regions from Wegweiser Kommune`))
	)
	.subscribe({
		next: async (regions) => {
			for (const region of regions) {
				const osm = await pool.maybeOne(getAdministrativeAreaOpenStreetMap(region.ags));

				const bbsr = await pool.maybeOne(getAdministrativeAreaBBSR(region.ars));

				const wikidata = osm?.wikidata_id
					? await pool.maybeOne(getAdministrativeAreaWikidata(osm.wikidata_id))
					: undefined;

				const maybeOrganizationalUnitContainer = organizationalUnitContainer.safeParse({
					managed_by: process.env.IMPORT_ORGANIZATIONAL_UNIT ?? process.env.IMPORT_ORGANIZATION,
					organization: process.env.IMPORT_ORGANIZATION,
					organizational_unit: process.env.IMPORT_ORGANIZATIONAL_UNIT ?? null,
					payload: {
						administrativeType: administrativeTypeFromRegionType.get(region.type),
						...(bbsr
							? { cityAndMunicipalityTypeBBSR: bbsr.city_and_municipality_type }
							: undefined),
						federalState: stateFromAGS.get(region.ags.substring(0, 2)),
						...(wikidata?.coat_of_arms ? { image: wikidata.coat_of_arms } : undefined),
						level: process.env.IMPORT_ORGANIZATIONAL_UNIT_LEVEL,
						name: region.title,
						officialMunicipalityKey: region.ags,
						officialRegionalCode: region.ars
					},
					realm: process.env.PUBLIC_KC_REALM ?? 'knot-dots',
					user: [
						{
							predicate: 'is-creator-of',
							subject: process.env.IMPORT_USER
						}
					]
				});

				const maybeMapContainer = mapContainer.safeParse({
					managed_by: process.env.IMPORT_ORGANIZATIONAL_UNIT ?? process.env.IMPORT_ORGANIZATION,
					organization: process.env.IMPORT_ORGANIZATION,
					organizational_unit: process.env.IMPORT_ORGANIZATIONAL_UNIT ?? null,
					payload: { geometry: osm?.boundary },
					realm: process.env.PUBLIC_KC_REALM ?? 'knot-dots',
					user: [
						{
							predicate: 'is-creator-of',
							subject: process.env.IMPORT_USER
						}
					]
				});

				const maybeMunicipalBasicDataContainer = municipalBasicDataContainer.safeParse({
					managed_by: process.env.IMPORT_ORGANIZATIONAL_UNIT ?? process.env.IMPORT_ORGANIZATION,
					organization: process.env.IMPORT_ORGANIZATION,
					organizational_unit: process.env.IMPORT_ORGANIZATIONAL_UNIT ?? null,
					payload: {},
					realm: process.env.PUBLIC_KC_REALM ?? 'knot-dots',
					user: [
						{
							predicate: 'is-creator-of',
							subject: process.env.IMPORT_USER
						}
					]
				});

				if (maybeOrganizationalUnitContainer.success && maybeMunicipalBasicDataContainer.success) {
					await pool.transaction(async (tx: DatabaseTransactionConnection) => {
						const savedOrganizationalUnitContainer = await createContainer(
							maybeOrganizationalUnitContainer.data
						)(tx);

						const savedMunicipalBasicDataContainer = await createContainer(
							maybeMunicipalBasicDataContainer.data
						)(tx);

						const relations = [
							{
								object: savedOrganizationalUnitContainer.guid,
								position: 0,
								predicate: 'is-section-of' as 'is-section-of',
								subject: savedMunicipalBasicDataContainer.guid
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

						if (maybeMapContainer.success) {
							const savedMapContainer = await createContainer(maybeMapContainer.data)(tx);
							relations.push({
								object: savedOrganizationalUnitContainer.guid,
								position: 1,
								predicate: 'is-section-of' as 'is-section-of',
								subject: savedMapContainer.guid
							});
						}

						await createRelation(relations)(tx);

						console.log(`created ${region.title} (${savedOrganizationalUnitContainer.guid})`);
						console.log(pool.state());
					});
				} else {
					console.error(
						`failed to create containers for ${region.title}`,
						maybeOrganizationalUnitContainer.error,
						maybeMunicipalBasicDataContainer.error
					);
				}
			}
		},
		error: (err) => {
			console.error(err);
		}
	});
