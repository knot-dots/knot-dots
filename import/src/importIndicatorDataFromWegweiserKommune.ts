import {
	getAllIndicatorWegweiserKommune,
	getPool,
	indicatorDataWegweiserKommune,
	insertIntoIndicatorDataWegweiserKommune
} from './db.ts';
import { EMPTY, from } from 'rxjs';
import { fromFetch } from 'rxjs/fetch';
import { concatMap, delay, map, retry, switchMap, tap } from 'rxjs/operators';
import { DatabasePool } from 'slonik';
import { z } from 'zod';

const envSchema = z
	.object({
		IMPORT_ORGANIZATION: z.uuid(),
		IMPORT_USER: z.uuid(),
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

function fetchIndicatorData$(pool: DatabasePool) {
	return from(pool.any(getAllIndicatorWegweiserKommune())).pipe(
		concatMap((all) => from(all)),
		concatMap(({ friendly_url, years }) => {
			const segments = [
				// All municipalities, grouped by the 16 federal state AGS prefixes
				...[...Array(16).keys()].map((i) => `kommunen-mit-ags-${String(i + 1).padStart(2, '0')}*`),
				// All federal states in one request
				'bundeslaender',
				// Germany as a whole
				'deutschland'
			];
			return from(segments.map((segment) => ({ friendlyUrl: friendly_url, segment, years })));
		}),
		concatMap(({ friendlyUrl, segment, years }) => {
			const base = 'https://www.wegweiser-kommune.de/data-api/rest/statistics/data/';
			const yearFrom = years[0];
			const yearTo = years[years.length - 1];
			const url = new URL(`${friendlyUrl}+${segment}+${yearFrom}-${yearTo}`, base);
			return fromFetch(url.toString()).pipe(
				switchMap((response) => {
					if (response.ok) {
						return response.json();
					} else if (response.status === 404) {
						// Not all indicators have data at every administrative level
						return EMPTY;
					} else {
						throw new Error(
							`Failed to fetch statistics from ${response.url}: status ${response.status}`
						);
					}
				}),
				retry({ count: 3, delay: 1000 }),
				delay(1000)
			);
		})
	);
}

(async function main() {
	const { organization, realm, user } = envSchema.parse(process.env);
	const pool = await getPool();

	fetchIndicatorData$(pool)
		.pipe(
			map((data) => statisticsData.parse(data)),
			tap((statistics) =>
				console.log(
					`Fetched statistics for "${statistics.indicatorsAndTopics[0].name}" in ${statistics.data.regions.length} administrative areas from ${statistics.years[0]} to ${statistics.years[statistics.years.length - 1]}`
				)
			),
			concatMap(async (statistics) => {
				await pool.query(
					insertIntoIndicatorDataWegweiserKommune(
						statistics.data.regions.map((region, regionIndex) =>
							indicatorDataWegweiserKommune.parse({
								indicator_id: statistics.indicatorsAndTopics[0].id,
								official_regional_code: region.ars.padEnd(12, '0'),
								actual_values: statistics.years.map((year, yearIndex) => [
									year,
									statistics.data.indicators[0].regionYearValues[regionIndex][yearIndex]
								])
							})
						)
					)
				);
			})
		)
		.subscribe({});
})();
