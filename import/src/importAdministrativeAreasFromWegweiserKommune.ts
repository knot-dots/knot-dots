import {
	administrativeAreaWegweiserKommune,
	getPool,
	insertIntoAdministrativeAreaWegweiserKommune,
	Json
} from './db.ts';
import { fromFetch } from 'rxjs/fetch';
import { map, mergeMap, tap } from 'rxjs/operators';
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
		IMPORT_TYPES: z
			.string()
			.default('BUND,BUNDESLAND,KREISFREIE_STADT,LANDKREIS,GEMEINDE')
			.transform((value) => value.split(',').filter(Boolean))
			.pipe(regionType.array())
	})
	.transform((value) => ({
		max: value.IMPORT_MAX,
		types: value.IMPORT_TYPES
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

(function main() {
	const { max, types } = envSchema.parse(process.env);

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
			},
			error: (err) => {
				console.error(err);
			}
		});
})();
