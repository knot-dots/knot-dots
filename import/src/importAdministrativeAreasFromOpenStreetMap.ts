import osmtogeojson from 'osmtogeojson';
import { DefaultOverpassApi, type OverpassJsonOutput } from 'overpass-ql-ts';
import { concat, from, of, timer, withLatestFrom } from 'rxjs';
import { concatMap, delay, map, retry, tap } from 'rxjs/operators';
import { v4 as uuidv4 } from 'uuid';
import * as z from 'zod';
import {
	administrativeAreaOpenStreetMap,
	getPool,
	insertIntoAdministrativeAreaOpenStreetMap,
	insertIntoSpatialFeature,
	spatialFeature
} from './db.ts';

type State = {
	relId: number;
	areaId: number;
	iso: string;
	name: string;
};

const DEFAULT_TIMEOUT = 240;
const DEFAULT_THROTTLE_MS = 60000;
const DEFAULT_LEVELS_PER_STATE = [5, 6, 8];
const DEFAULT_INCLUDED_STATES = [
	'DE-BB',
	'DE-BE',
	'DE-BW',
	'DE-BY',
	'DE-HB',
	'DE-HE',
	'DE-HH',
	'DE-MV',
	'DE-NI',
	'DE-NW',
	'DE-RP',
	'DE-SH',
	'DE-SL',
	'DE-SN',
	'DE-ST',
	'DE-TH'
];

const DEFAULT_OVERPASS_API_URL = 'https://overpass-api.de/api/interpreter';
const DEFAULT_MAX_RETRIES = 4;

const envSchema = z
	.object({
		TIMEOUT_SECONDS: z.coerce.number().int().default(DEFAULT_TIMEOUT),
		THROTTLE_MS: z.coerce.number().int().default(DEFAULT_THROTTLE_MS),
		LEVELS_PER_STATE: z
			.string()
			.default(DEFAULT_LEVELS_PER_STATE.join(','))
			.transform((value) => value.split(',').map((s) => parseInt(s)))
			.pipe(z.number().array()),
		INCLUDED_STATES: z
			.string()
			.default(DEFAULT_INCLUDED_STATES.join(','))
			.transform((value) => value.split(','))
			.pipe(z.string().array()),
		OVERPASS_API_URL: z.url().default(DEFAULT_OVERPASS_API_URL),
		MAX_RETRIES: z.coerce.number().int().min(0).default(DEFAULT_MAX_RETRIES)
	})
	.transform((value) => ({
		timeoutSeconds: value.TIMEOUT_SECONDS,
		throttleMs: value.THROTTLE_MS,
		levelsPerState: value.LEVELS_PER_STATE,
		includedStates: value.INCLUDED_STATES,
		overpassApiUrl: value.OVERPASS_API_URL,
		maxRetries: value.MAX_RETRIES
	}));

type FetchOptions = z.infer<typeof envSchema>;

function qlStates(timeout: number) {
	return `
[out:json][timeout:${timeout}];
rel["boundary"="administrative"]["admin_level"="4"]["ISO3166-2"~"^DE-"];
out body;
>;
out skel qt;
`;
}

function qlGermany(timeout: number) {
	return `
[out:json][timeout:${timeout}];
rel["boundary"="administrative"]["admin_level"="2"]["ISO3166-1"="DE"];
out body;
>;
out skel qt;
`;
}

function qlLevelInArea(areaId: number, timeout: number, level: number) {
	return `
[out:json][timeout:${timeout}];
area(${areaId})->.st;
rel(area.st)["boundary"="administrative"]["admin_level"="${level}"];
out body;
>;
out skel qt;
`;
}

async function fetchGermany(timeoutSeconds: number, apiUrl: string) {
	return DefaultOverpassApi({ interpreterUrl: apiUrl }).execQuery(qlGermany(timeoutSeconds));
}

async function fetchStates(timeoutSeconds: number, apiUrl: string) {
	return DefaultOverpassApi({ interpreterUrl: apiUrl }).execQuery(qlStates(timeoutSeconds));
}

function extractStateRouting(result: OverpassJsonOutput, includedStates: string[]): State[] {
	const elements = ((result as OverpassJsonOutput).elements ?? []) as Array<{
		id: number;
		type?: string;
		tags?: Record<string, string>;
	}>;
	return elements
		.filter((e) => e.type === 'relation')
		.filter((e) => e.tags?.['ISO3166-2']?.startsWith('DE-'))
		.filter((e) => includedStates.includes(e.tags!['ISO3166-2']))
		.map((e) => {
			const relId = e.id;
			const areaId = 3600000000 + relId; // Overpass area-ID für Relationen
			const iso = e.tags!['ISO3166-2'];
			const name = e.tags!.name ?? iso;
			return { relId, areaId, iso, name };
		});
}

async function fetchLevelForState(
	state: State,
	level: number,
	timeoutSeconds: number,
	apiUrl: string
) {
	const query = qlLevelInArea(state.areaId, timeoutSeconds, level);
	return DefaultOverpassApi({ interpreterUrl: apiUrl }).execQuery(query);
}

function retryOnError<T>(delayMs: number, maxRetries: number) {
	return retry<T>({
		count: maxRetries,
		delay: (error, retryCount) => {
			console.log(
				`Request failed (attempt ${retryCount}/${maxRetries}), retrying in ${delayMs}ms...`
			);
			return timer(delayMs);
		}
	});
}

export function extractAdministrativeAreas(opts: FetchOptions) {
	const { timeoutSeconds, throttleMs, levelsPerState, includedStates, overpassApiUrl, maxRetries } =
		opts;

	const germany$ = from(fetchGermany(timeoutSeconds, overpassApiUrl)).pipe(
		retryOnError(throttleMs, maxRetries),
		tap(() => console.log('Fetched Germany')),
		delay(throttleMs)
	);

	const statesAndLevels$ = from(fetchStates(timeoutSeconds, overpassApiUrl)).pipe(
		retryOnError(throttleMs, maxRetries),
		tap(() => console.log('Fetched federal states')),
		delay(throttleMs),
		concatMap((result) => {
			const states = extractStateRouting(result as OverpassJsonOutput, includedStates);
			return concat(
				of(result),
				from(states).pipe(
					concatMap((state) =>
						from(levelsPerState).pipe(
							concatMap((level) =>
								from(fetchLevelForState(state, level, timeoutSeconds, overpassApiUrl)).pipe(
									retryOnError(throttleMs, maxRetries),
									tap(() => console.log(`Fetched administrative level ${level} of ${state.name}`)),
									delay(throttleMs)
								)
							)
						)
					)
				)
			);
		})
	);

	return concat(germany$, statesAndLevels$);
}

extractAdministrativeAreas(envSchema.parse(process.env))
	.pipe(
		map((e) => {
			const data = osmtogeojson(e)
				.features.filter((f) => f.properties?.type === 'boundary')
				.filter((f) => f.properties?.boundary === 'administrative')
				.map((f) => {
					const guid = uuidv4();
					return {
						spatialFeature: spatialFeature.parse({ geom: f.geometry, guid }),
						administrativeArea: administrativeAreaOpenStreetMap.parse({
							boundary: guid,
							name: f.properties?.name,
							official_municipality_key: f.properties?.['de:amtlicher_gemeindeschluessel'],
							official_regional_code: f.properties?.['de:regionalschluessel'],
							relation_id: (f.id as string).split('/')[1],
							wikidata_id: f.properties?.wikidata
						})
					};
				});
			console.log(`Parsed ${data.length} features`);
			return data;
		}),
		withLatestFrom(from(getPool()))
	)
	.subscribe({
		next: async ([data, pool]) => {
			await pool.transaction(async (tx) => {
				const chunkSize = 1000;
				for (let i = 0; i < data.length; i += chunkSize) {
					await tx.query(
						insertIntoSpatialFeature(
							data.slice(i, i + chunkSize).map(({ spatialFeature }) => spatialFeature)
						)
					);
					await tx.query(
						insertIntoAdministrativeAreaOpenStreetMap(
							data.slice(i, i + chunkSize).map(({ administrativeArea }) => administrativeArea)
						)
					);
					console.log(`Inserted ${Math.min(i + chunkSize, data.length)} / ${data.length} areas`);
				}
			});
			console.log(`Committed ${data.length} areas to database`);
		},
		error: (err) => {
			console.error(err);
			DefaultOverpassApi({ interpreterUrl: envSchema.parse(process.env).overpassApiUrl })
				.status()
				.then((v) => console.log(v));
		}
	});
