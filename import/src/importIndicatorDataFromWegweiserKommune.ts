import {
	actualDataContainer,
	createContainer,
	getAllIndicatorWegweiserKommune,
	getContainer,
	getPool,
	indicatorDataWegweiserKommune,
	insertIntoIndicatorDataWegweiserKommune,
	updateContainer
} from './db.ts';
import assert from 'node:assert';
import { from } from 'rxjs';
import { fromFetch } from 'rxjs/fetch';
import { concatMap, delay, map, retry, switchMap, tap } from 'rxjs/operators';
import { DatabasePool } from 'slonik';
import { z } from 'zod';

const envSchema = z
	.object({
		IMPORT_ORGANIZATION: z.string().uuid(),
		IMPORT_USER: z.string().uuid(),
		PUBLIC_KC_REALM: z.string().default('knot-dots')
	})
	.transform((value) => ({
		organization: value.IMPORT_ORGANIZATION,
		realm: value.PUBLIC_KC_REALM,
		user: value.IMPORT_USER
	}));

const statisticsData = z.object({
	data: z.object({
		indicators: z.array(
			z.object({
				regionYearValues: z.array(z.array(z.number().nullable()))
			})
		),
		regions: z.array(
			z.object({
				ars: z.string(),
				title: z.string()
			})
		),
		type: z.string()
	}),
	indicatorsAndTopics: z.array(
		z.object({
			id: z.number(),
			explanation: z.string(),
			friendlyUrl: z.string(),
			name: z.string(),
			source: z.string(),
			title: z.string(),
			unit: z.string()
		})
	),
	years: z.array(z.number().int().positive())
});

const unitMap = new Map([
	['Euro je Einwohner:in', 'unit.euro_per_capita'],
	['Euro je Einwohner', 'unit.euro_per_capita'],
	['Euro je m²', 'unit.euro_per_square_meter'],
	['kg/ha', 'unit.kilogram_per_hectare'],
	['l je Einwohner:in und Tag', 'unit.liter_per_capita_per_day'],
	['Meter', 'unit.meter'],
	['μg / m³', 'unit.microgram_per_cubic_meter'],
	['Minuten', 'unit.minute'],
	['Anzahl', 'unit.n'],
	['%', 'unit.percent'],
	['m²', 'unit.square_meter'],
	['m² je Einwohner:in', 'unit.square_meter_per_capita'],
	['t je Einwohner:in', 'unit.ton_per_capita'],
	['Jahre', 'unit.year']
]);

function fetchIndicatorData$(pool: DatabasePool) {
	return from(pool.any(getAllIndicatorWegweiserKommune())).pipe(
		concatMap((all) => from(all)),
		concatMap((each) => {
			const { friendly_url, years } = each;
			return from(
				[...Array(16).keys()].map((i) => [friendly_url, String(i + 1).padStart(2, '0'), years])
			);
		}),
		concatMap(([friendlyUrl, officialMunicipalityKeyPrefix, years]) => {
			const base = 'https://www.wegweiser-kommune.de/data-api/rest/statistics/data/';
			const from = years[0];
			const to = years[years.length - 1];
			const url = new URL(
				`${friendlyUrl}+kommunen-mit-ags-${officialMunicipalityKeyPrefix}*+${from}-${to}`,
				base
			);
			return fromFetch(url.toString()).pipe(
				switchMap((response) => {
					if (response.ok) {
						return response.json();
					} else {
						throw new Error(
							`failed to fetch statistics from ${response.url}: status ${response.status}`
						);
					}
				}),
				retry({ count: 3, delay: 1000 }),
				delay(1000)
			);
		})
	);
}

function isSame<T>(a: T, b: T) {
	try {
		assert.deepEqual(a, b);
		return true;
	} catch (_) {
		return false;
	}
}

(async function main() {
	const { organization, realm, user } = envSchema.parse(process.env);
	const pool = await getPool();

	fetchIndicatorData$(pool)
		.pipe(
			map((data) => statisticsData.parse(data)),
			tap((statistics) =>
				console.log(
					`fetched statistics for "${statistics.indicatorsAndTopics[0].name}" in ${statistics.data.regions.length} administrative areas from ${statistics.years[0]} to ${statistics.years[statistics.years.length - 1]}`
				)
			)
		)
		.subscribe({
			next: async (statistics) => {
				await pool.query(
					insertIntoIndicatorDataWegweiserKommune(
						statistics.data.regions.map((region, regionIndex) =>
							indicatorDataWegweiserKommune.parse({
								indicator_id: statistics.indicatorsAndTopics[0].id,
								official_regional_code: region.ars,
								actual_values: statistics.years.map((year, yearIndex) => [
									year,
									statistics.data.indicators[0].regionYearValues[regionIndex][yearIndex]
								])
							})
						)
					)
				);

				for (const [regionIndex, region] of statistics.data.regions.entries()) {
					try {
						await pool.transaction(async (tx) => {
							const externalReference = `https://www.wegweiser-kommune.de/data-api/rest/indicator/get/${statistics.indicatorsAndTopics[0].friendlyUrl}`;

							const organizationalUnit = await getContainer({
								organization,
								organizationalUnit: null,
								payload: {
									officialRegionalCode: region.ars,
									organizationalUnitType: 'organizational_unit_type.administrative_area',
									type: 'organizational_unit'
								}
							})(tx);

							const indicatorTemplate = await getContainer({
								organization,
								organizationalUnit: null,
								payload: { externalReference, type: 'indicator_template' }
							})(tx);

							if (!organizationalUnit || !indicatorTemplate) {
								return;
							}

							const newActualDataContainer = actualDataContainer.parse({
								managed_by: organizationalUnit.guid,
								organization,
								organizational_unit: organizationalUnit.guid,
								payload: {
									indicator: indicatorTemplate.guid,
									source: statistics.indicatorsAndTopics[0].source,
									title: statistics.indicatorsAndTopics[0].title,
									values: statistics.years
										.map((year, yearIndex) => [
											year,
											statistics.data.indicators[0].regionYearValues[regionIndex][yearIndex]
										])
										.filter(([, value]) => value !== null)
								},
								realm,
								user: [{ predicate: 'is-creator-of', subject: user }]
							});

							const foundActualDataContainer = await getContainer({
								organization,
								organizationalUnit: organizationalUnit.guid,
								payload: { indicator: indicatorTemplate.guid, type: 'actual_data' }
							})(tx);

							if (foundActualDataContainer) {
								if (isSame(foundActualDataContainer.payload, newActualDataContainer.payload)) {
									console.log(
										`ignored indicator "${statistics.indicatorsAndTopics[0].name}" for ${region.title} (${foundActualDataContainer.guid})`
									);
								} else {
									const updatedActualDataContainer = await updateContainer({
										...foundActualDataContainer,
										payload: newActualDataContainer.payload
									})(tx);

									console.log(
										`updated indicator "${statistics.indicatorsAndTopics[0].name}" for ${region.title} (${updatedActualDataContainer.guid})`
									);
								}
							} else {
								const savedActualDataContainer = await createContainer(newActualDataContainer)(tx);

								console.log(
									`created indicator "${statistics.indicatorsAndTopics[0].name}" for ${region.title} (${savedActualDataContainer.guid})`
								);
							}
						});
					} catch (error) {
						console.error(
							`failed to save statistics for "${statistics.indicatorsAndTopics[0].name}" in administrative area ${region.ars}`,
							JSON.stringify(error)
						);
					}
				}
			},
			complete: () => {
				console.log('done');
			},
			error: console.error
		});
})();
