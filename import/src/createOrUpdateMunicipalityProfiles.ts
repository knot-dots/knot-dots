import {
	IndicatorTemplateContainer,
	OrganizationalUnitContainer
} from '@knot-dots/app/src/lib/models.ts';
import assert from 'node:assert';
import { DatabaseTransactionConnection } from 'slonik';
import { z } from 'zod';
import {
	actualDataContainer,
	administrativeAreaBasicDataContainer,
	AdministrativeAreaBBSR,
	AdministrativeAreaOpenStreetMap,
	AdministrativeAreaWegweiserKommune,
	AdministrativeAreaWikidata,
	createContainer,
	createRelation,
	customCollectionContainer,
	demographicDataContainer,
	getAdministrativeAreaBBSR,
	getAdministrativeAreaOpenStreetMap,
	getAdministrativeAreaOpenStreetMapByRelationId,
	getAdministrativeAreaWikidata,
	getAdministrativeAreaWikidataByRegionalCode,
	getAllAdministrativeAreaWegweiserKommune,
	getContainer,
	getIndicatorDataWegweiserKommune,
	getPool,
	mapContainer,
	organizationalUnitContainer,
	updateContainer
} from './db.ts';
import { AdministrativeAreaDifu, getAdministrativeAreasDifu } from './difu.ts';

const administrativeTypeFromRegionType = new Map([
	['BUND', 'administrative_type.country'],
	['BUNDESLAND', 'administrative_type.federal_state'],
	['LANDKREIS', 'administrative_type.rural_district'],
	['KREISFREIE_STADT', 'administrative_type.urban_district'],
	['GEMEINDE', 'administrative_type.municipality']
]);

// Hamburg (02), Bremen (04), Berlin (11) are city-states: simultaneously
// a federal state and an urban district. However, Bremen also has a federal
// state entry in Wegweiser Kommune, so only Berlin and Hamburg are stored as
// KREISFREIE_STADT in Wegweiser Kommune. For these two, we want to assign both.
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

const envSchema = z
	.object({
		DIFU_FILE: z.string().nonempty(),
		IMPORT_CUSTOM_CATEGORY: z
			.preprocess((data: string) => JSON.parse(data), z.record(z.string(), z.array(z.string())))
			.optional(),
		IMPORT_ORGANIZATION: z.uuid(),
		IMPORT_ORGANIZATIONAL_UNIT: z.uuid().nullable().default(null),
		IMPORT_ORGANIZATIONAL_UNIT_LEVEL: z.coerce.number().int().positive().default(1),
		IMPORT_REPORTS: z
			.string()
			.default('')
			.transform((value) => value.split(',').filter(Boolean))
			.pipe(z.array(z.uuid())),
		IMPORT_USER: z.uuid(),
		PUBLIC_KC_REALM: z.string().default('knot-dots')
	})
	.transform((value) => ({
		category: value.IMPORT_CUSTOM_CATEGORY,
		difu_file: value.DIFU_FILE,
		organization: value.IMPORT_ORGANIZATION,
		organizationalUnit: value.IMPORT_ORGANIZATIONAL_UNIT,
		organizationalUnitLevel: value.IMPORT_ORGANIZATIONAL_UNIT_LEVEL,
		realm: value.PUBLIC_KC_REALM,
		reports: value.IMPORT_REPORTS,
		user: value.IMPORT_USER
	}));

(async function main() {
	const env = envSchema.parse(process.env);

	const difu = getAdministrativeAreasDifu(env.difu_file);

	const pool = await getPool();

	for (const region of await pool.many(getAllAdministrativeAreaWegweiserKommune())) {
		try {
			let osm = await pool.maybeOne(
				getAdministrativeAreaOpenStreetMap(region.official_regional_code)
			);

			const bbsr = await pool.maybeOne(getAdministrativeAreaBBSR(region.official_regional_code));

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

			await pool.transaction(async (tx: DatabaseTransactionConnection) => {
				let ouContainer = await createOrUpdateOrganizationalUnitContainer(
					tx,
					region,
					wikidata,
					osm,
					bbsr,
					difu?.get(region.official_municipality_key) ?? null,
					env
				);

				const administrativeAreaBasicDataContainer =
					await createOrGetAdministrativeAreaBasicDataContainer(tx, ouContainer);

				const mapContainer = await createOrGetMapContainer(tx, ouContainer);

				let demographicDataContainer = await createOrUpdateDemographicDataContainer(
					tx,
					ouContainer
				);

				let reportCollectionContainer = await createOrUpdateReportCollectionContainer(
					tx,
					ouContainer,
					env.reports
				);

				const relations = [
					{
						object: ouContainer.guid,
						position: 0,
						predicate: 'is-section-of' as const,
						subject: administrativeAreaBasicDataContainer.guid
					},
					{
						object: ouContainer.guid,
						position: 1,
						predicate: 'is-section-of' as const,
						subject: demographicDataContainer.guid
					},
					{
						object: ouContainer.guid,
						position: 2,
						predicate: 'is-section-of' as const,
						subject: mapContainer.guid
					},
					{
						object: ouContainer.guid,
						position: 3,
						predicate: 'is-section-of' as const,
						subject: reportCollectionContainer.guid
					},
					...(env.organizationalUnit
						? [
								{
									object: env.organizationalUnit,
									position: 0,
									predicate: 'is-part-of' as const,
									subject: ouContainer.guid
								}
							]
						: [])
				];

				await createRelation(relations)(tx);

				await createOrUpdateActualDataContainers(tx, ouContainer);
			});
		} catch (error) {
			console.error(`Failed to save ${region.title}`, error);
		}
	}
})();

async function createOrUpdateOrganizationalUnitContainer(
	tx: DatabaseTransactionConnection,
	region: AdministrativeAreaWegweiserKommune,
	wikidata: AdministrativeAreaWikidata | null,
	osm: AdministrativeAreaOpenStreetMap | null,
	bbsr: AdministrativeAreaBBSR | null,
	difu: AdministrativeAreaDifu | null,
	env: z.infer<typeof envSchema>
) {
	const { category, organization, organizationalUnitLevel, realm, user } = env;

	const newOrganizationalUnitContainer = organizationalUnitContainer.parse({
		managed_by: organization,
		organization: organization,
		organizational_unit: null,
		payload: {
			administrativeType: getAdministrativeTypes(region.type, region.official_municipality_key),
			boards: ['board.indicators'],
			category: {
				...category,
				...(difu ? { kommunaltyp: [difu.code] } : undefined)
			},
			...(bbsr ? { cityAndMunicipalityTypeBBSR: bbsr.city_and_municipality_type } : undefined),
			federalState: stateFromAGS.get(region.official_municipality_key.substring(0, 2)),
			...(osm ? { geometry: osm.boundary, nameOSM: osm?.name } : undefined),
			...(wikidata?.coat_of_arms ? { image: wikidata.coat_of_arms } : undefined),
			level: organizationalUnitLevel,
			name: region.title,
			officialMunicipalityKey: region.official_municipality_key,
			officialRegionalCode: region.official_regional_code,
			organizationalUnitType: 'organizational_unit_type.administrative_area',
			type: 'organizational_unit'
		},
		realm,
		user: [{ predicate: 'is-creator-of', subject: user }]
	});

	const foundOrganizationalUnitContainer = await getContainer({
		organization,
		organizationalUnit: null,
		payload: {
			officialRegionalCode: newOrganizationalUnitContainer.payload.officialRegionalCode ?? '',
			organizationalUnitType: 'organizational_unit_type.administrative_area',
			type: 'organizational_unit'
		}
	})(tx);

	let result;

	if (!foundOrganizationalUnitContainer) {
		result = await createContainer(newOrganizationalUnitContainer)(tx);
		console.log(`Created ${region.title} (${result.guid})`);
	} else {
		if (!isSame(foundOrganizationalUnitContainer.payload, newOrganizationalUnitContainer.payload)) {
			result = await updateContainer({
				...foundOrganizationalUnitContainer,
				payload: newOrganizationalUnitContainer.payload
			})(tx);
			console.log(`Updated ${region.title} (${result.guid})`);
		} else {
			result = foundOrganizationalUnitContainer;
			console.log(`Ignored ${region.title} (${result.guid})`);
		}
	}

	return result as OrganizationalUnitContainer;
}

async function createOrGetAdministrativeAreaBasicDataContainer(
	tx: DatabaseTransactionConnection,
	ouContainer: OrganizationalUnitContainer
) {
	const foundAdministrativeAreaBasicDataContainer = await getContainer({
		organization: ouContainer.organization,
		organizationalUnit: ouContainer.guid,
		payload: { type: 'administrative_area_basic_data' }
	})(tx);

	if (foundAdministrativeAreaBasicDataContainer) {
		return foundAdministrativeAreaBasicDataContainer;
	}

	return await createContainer(
		administrativeAreaBasicDataContainer.parse({
			managed_by: ouContainer.guid,
			organization: ouContainer.organization,
			organizational_unit: ouContainer.guid,
			payload: {
				type: 'administrative_area_basic_data',
				title: 'Basisinformationen'
			},
			realm: ouContainer.realm,
			user: ouContainer.user
		})
	)(tx);
}

async function createOrGetMapContainer(
	tx: DatabaseTransactionConnection,
	ouContainer: OrganizationalUnitContainer
) {
	const foundMapContainer = await getContainer({
		organization: ouContainer.organization,
		organizationalUnit: ouContainer.guid,
		payload: { type: 'map' }
	})(tx);

	if (foundMapContainer) {
		return foundMapContainer;
	}

	return await createContainer(
		mapContainer.parse({
			managed_by: ouContainer.guid,
			organization: ouContainer.organization,
			organizational_unit: ouContainer.guid,
			payload: { type: 'map', title: 'Gebietsgrenze' },
			realm: ouContainer.realm,
			user: ouContainer.user
		})
	)(tx);
}

async function createOrUpdateDemographicDataContainer(
	tx: DatabaseTransactionConnection,
	ouContainer: OrganizationalUnitContainer
) {
	const newDemographicDataContainer = demographicDataContainer.parse({
		managed_by: ouContainer.guid,
		organization: ouContainer.organization,
		organizational_unit: ouContainer.guid,
		payload: {
			title: 'Basisindikatoren',
			type: 'demographic_data'
		},
		realm: ouContainer.realm,
		user: ouContainer.user
	});

	const foundDemographicDataContainer = await getContainer({
		organization: ouContainer.organization,
		organizationalUnit: ouContainer.guid,
		payload: { type: 'demographic_data' }
	})(tx);

	let result;

	if (foundDemographicDataContainer) {
		if (!isSame(foundDemographicDataContainer.payload, newDemographicDataContainer.payload)) {
			result = await updateContainer({
				...foundDemographicDataContainer,
				payload: {
					...newDemographicDataContainer.payload
				}
			})(tx);
			console.log(`Updated demographic data for ${ouContainer.payload.name} (${result.guid})`);
		} else {
			result = foundDemographicDataContainer;
			console.log(`Ignored demographic data for ${ouContainer.payload.name} (${result.guid})`);
		}
	} else {
		result = await createContainer(newDemographicDataContainer)(tx);
		console.log(`Created demographic data for ${ouContainer.payload.name} (${result.guid})`);
	}

	return result;
}

async function createOrUpdateReportCollectionContainer(
	tx: DatabaseTransactionConnection,
	ouContainer: OrganizationalUnitContainer,
	reports: string[]
) {
	const reportCollectionTitle = 'Nachhaltigkeitsberichte';

	const newReportCollectionContainer = customCollectionContainer.parse({
		managed_by: ouContainer.guid,
		organization: ouContainer.organization,
		organizational_unit: ouContainer.guid,
		payload: {
			type: 'custom_collection',
			item: reports,
			title: reportCollectionTitle
		},
		realm: ouContainer.realm,
		user: ouContainer.user
	});

	const foundReportCollectionContainer = await getContainer({
		organization: ouContainer.organization,
		organizationalUnit: ouContainer.guid,
		payload: { title: reportCollectionTitle, type: 'custom_collection' }
	})(tx);

	let result;

	if (foundReportCollectionContainer) {
		if (!isSame(foundReportCollectionContainer.payload, newReportCollectionContainer.payload)) {
			result = await updateContainer({
				...foundReportCollectionContainer,
				payload: {
					...newReportCollectionContainer.payload
				}
			})(tx);
			console.log(`Updated report collection for ${ouContainer.payload.name} (${result.guid})`);
		} else {
			result = foundReportCollectionContainer;
			console.log(`Ignored report collection for ${ouContainer.payload.name} (${result.guid})`);
		}
	} else {
		result = await createContainer(newReportCollectionContainer)(tx);
		console.log(`Created report collection for ${ouContainer.payload.name} (${result.guid})`);
	}

	return result;
}

async function createOrUpdateActualDataContainers(
	tx: DatabaseTransactionConnection,
	ouContainer: OrganizationalUnitContainer
) {
	if (!ouContainer.payload.geometry) {
		return;
	}

	const statistics = await tx.any(
		getIndicatorDataWegweiserKommune(ouContainer.payload.geometry, [
			'Nachhaltigkeit / SDGs',
			'Demografische Entwicklung'
		])
	);

	for (const data of statistics) {
		try {
			const externalReference = `https://www.wegweiser-kommune.de/data-api/rest/indicator/get/${data.friendly_url}`;
			const indicatorTemplate = (await getContainer({
				organization: ouContainer.organization,
				organizationalUnit: null,
				payload: { externalReference, type: 'indicator_template' }
			})(tx)) as IndicatorTemplateContainer;

			if (!indicatorTemplate) {
				continue;
			}

			if (data.actual_values.filter(([, value]) => value !== null).length === 0) {
				continue;
			}

			const newActualDataContainer = actualDataContainer.parse({
				managed_by: ouContainer.guid,
				organization: ouContainer.organization,
				organizational_unit: ouContainer.guid,
				payload: {
					type: 'actual_data',
					indicator: indicatorTemplate.guid,
					source: 'Wegweiser Kommune',
					title: indicatorTemplate.payload.title,
					values: data.actual_values.filter(([, value]) => value !== null)
				},
				realm: ouContainer.realm,
				user: ouContainer.user
			});

			const foundActualDataContainer = await getContainer({
				organization: ouContainer.organization,
				organizationalUnit: ouContainer.guid,
				payload: { indicator: indicatorTemplate.guid, type: 'actual_data' }
			})(tx);

			if (foundActualDataContainer) {
				if (isSame(foundActualDataContainer.payload, newActualDataContainer.payload)) {
					console.log(
						`Ignored actual data for "${indicatorTemplate.payload.title}" in ${ouContainer.payload.name} (${foundActualDataContainer.guid})`
					);
				} else {
					const updatedActualDataContainer = await updateContainer({
						...foundActualDataContainer,
						payload: newActualDataContainer.payload
					})(tx);

					console.log(
						`Updated actual data for "${indicatorTemplate.payload.title}" in ${ouContainer.payload.name}} (${updatedActualDataContainer.guid})`
					);
				}
			} else {
				const savedActualDataContainer = await createContainer(newActualDataContainer)(tx);

				console.log(
					`Created actual data for "${indicatorTemplate.payload.title}" in ${ouContainer.payload.name} (${savedActualDataContainer.guid})`
				);
			}
		} catch (error) {
			console.error(
				`Failed to save actual data for administrative area ${ouContainer.payload.officialRegionalCode}`,
				JSON.stringify(error)
			);
		}
	}
}

function isSame<T>(a: T, b: T) {
	try {
		assert.deepEqual(a, b);
		return true;
	} catch (_) {
		return false;
	}
}
