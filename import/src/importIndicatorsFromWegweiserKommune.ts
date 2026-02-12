import {
	createContainer,
	getContainer,
	getPool,
	indicatorTemplateContainer,
	indicatorWegweiserKommune,
	insertIntoIndicatorWegweiserKommune,
	updateContainer
} from './db.ts';
import assert from 'node:assert';
import { fromFetch } from 'rxjs/fetch';
import { map, mergeMap, tap } from 'rxjs/operators';
import { z } from 'zod';

const envSchema = z
	.object({
		IMPORT_MAX: z.coerce.number().int().positive().default(10000),
		IMPORT_ORGANIZATION: z.string().uuid(),
		IMPORT_USER: z.string().uuid(),
		PUBLIC_KC_REALM: z.string().default('knot-dots')
	})
	.transform((value) => ({
		organization: value.IMPORT_ORGANIZATION,
		max: value.IMPORT_MAX,
		realm: value.PUBLIC_KC_REALM,
		user: value.IMPORT_USER
	}));

const indicator = z.object({
	calculation: z.string(),
	colorSchema: z.string(),
	decimalPlaces: z.number().int().nonnegative(),
	explanation: z.string(),
	friendlyUrl: z.string(),
	id: z.number().int(),
	hint: z.string().optional(),
	maximumClassification: z.number().optional(),
	maximumRegionType: z.string(),
	minimumClassification: z.number().optional(),
	minimumRegionType: z.string(),
	name: z.string(),
	source: z.string(),
	topLowRegionsAvailable: z.boolean(),
	topics: z.array(z.string()),
	title: z.string(),
	type: z.string(),
	unit: z.string(),
	years: z.array(z.number().int().nonnegative())
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

function fetchIndicators$(params: { max?: number; search?: string }) {
	const url = new URL('https://www.wegweiser-kommune.de/data-api/rest/indicator/list');

	if (params.max) {
		url.searchParams.set('max', String(params.max));
	}

	if (params.search) {
		url.searchParams.set('search', params.search);
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

(async function main() {
	const { organization, max, realm, user } = envSchema.parse(process.env);
	const pool = await getPool();

	fetchIndicators$({ max, search: 'ist-daten' })
		.pipe(
			mergeMap((response) => response.json()),
			map((data) =>
				z
					.array(indicator)
					.parse(data)
					.map((indicator) =>
						indicatorWegweiserKommune.parse({
							calculation: indicator.calculation,
							color_schema: indicator.colorSchema,
							decimal_places: indicator.decimalPlaces,
							explanation: indicator.explanation,
							friendly_url: indicator.friendlyUrl,
							hint: indicator.hint,
							id: indicator.id,
							maximum_classification: indicator.maximumClassification,
							maximum_region_type: indicator.maximumRegionType,
							minimum_classification: indicator.minimumClassification,
							minimum_region_type: indicator.minimumRegionType,
							name: indicator.name,
							source: indicator.source,
							top_low_regions_available: indicator.topLowRegionsAvailable,
							topics: indicator.topics,
							title: indicator.title,
							type: indicator.type,
							unit: indicator.unit,
							years: indicator.years
						})
					)
			),
			tap((indicators) =>
				console.log(`fetched ${indicators.length} indicators from Wegweiser Kommune`)
			)
		)
		.subscribe({
			next: async (indicators) => {
				await pool.query(insertIntoIndicatorWegweiserKommune(indicators));

				for (const indicator of indicators) {
					try {
						const externalReference = `https://www.wegweiser-kommune.de/data-api/rest/indicator/get/${indicator.friendly_url}`;
						const newIndicatorTemplateContainer = indicatorTemplateContainer.parse({
							managed_by: organization,
							organization: organization,
							organizational_unit: null,
							payload: {
								description: indicator.explanation,
								externalReference,
								indicatorCategory: [
									'indicator_category.wegweiser_kommune',
									...(indicator.topics.includes('Nachhaltigkeit / SDGs')
										? ['indicator_category.sdg']
										: [])
								],
								title: indicator.name,
								unit: unitMap.get(indicator.unit) ?? indicator.unit
							},
							realm,
							user: [{ predicate: 'is-creator-of', subject: user }]
						});

						await pool.transaction(async (tx) => {
							const foundIndicatorTemplateContainer = await getContainer({
								organization,
								organizationalUnit: null,
								payload: { externalReference, type: 'indicator_template' }
							})(tx);

							if (foundIndicatorTemplateContainer) {
								if (
									isSame(
										foundIndicatorTemplateContainer.payload,
										newIndicatorTemplateContainer.payload
									)
								) {
									console.log(
										`ignored indicator "${indicator.name}" (${foundIndicatorTemplateContainer.guid})`
									);
								} else {
									const updatedIndicatorTemplateContainer = await updateContainer({
										...foundIndicatorTemplateContainer,
										payload: newIndicatorTemplateContainer.payload
									})(tx);

									console.log(
										`updated indicator template "${indicator.name}" (${updatedIndicatorTemplateContainer.guid})`
									);
								}
							} else {
								const savedIndicatorTemplateContainer = await createContainer(
									newIndicatorTemplateContainer
								)(tx);

								console.log(
									`created indicator template "${indicator.name}" (${savedIndicatorTemplateContainer.guid})`
								);
							}
						});
					} catch (error) {
						console.error(`failed to save "${indicator.name}"`, JSON.stringify(error));
					}
				}
			},
			error: console.error
		});
})();
