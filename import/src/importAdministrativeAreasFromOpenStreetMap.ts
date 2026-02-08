import osmtogeojson from 'osmtogeojson';
import { DefaultOverpassApi, type OverpassJsonOutput } from 'overpass-ql-ts';
import { from, iif, of, throwError, withLatestFrom } from 'rxjs';
import { concatMap, delay, filter, map, retryWhen, tap } from 'rxjs/operators';
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
const DEFAULT_LEVELS_PER_STATE = [4, 5, 6, 8];
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

const envSchema = z
	.object({
		TIMEOUT_SECONDS: z.coerce.number().int().default(DEFAULT_TIMEOUT),
		THROTTLE_MS: z.coerce.number().int().default(DEFAULT_THROTTLE_MS),
		LEVELS_PER_STATE: z
			.string()
			.transform((value) => value.split(','))
			.pipe(z.coerce.number().array())
			.default(DEFAULT_LEVELS_PER_STATE.join(',')),
		INCLUDED_STATES: z
			.string()
			.transform((value) => value.split(','))
			.pipe(z.string().array())
			.default(DEFAULT_INCLUDED_STATES.join(','))
	})
	.transform((value) => ({
		timeoutSeconds: value.TIMEOUT_SECONDS,
		throttleMs: value.THROTTLE_MS,
		levelsPerState: value.LEVELS_PER_STATE,
		includedStates: value.INCLUDED_STATES
	}));

type FetchOptions = z.infer<typeof envSchema>;

function qlStates(timeout: number) {
	return `
[out:json][timeout:${timeout}];
rel["boundary"="administrative"]["admin_level"="4"]["ISO3166-2"~"^DE-"];
out ids tags;
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

async function fetchStates(timeoutSeconds: number): Promise<State[]> {
	const result = await DefaultOverpassApi().execQuery(qlStates(timeoutSeconds));
	const elements = ((result as OverpassJsonOutput).elements ?? []) as Array<{
		id: number;
		tags?: Record<string, string>;
	}>;

	return elements
		.filter((e) => e.tags?.['ISO3166-2']?.startsWith('DE-'))
		.map((e) => {
			const relId = e.id;
			const areaId = 3600000000 + relId; // Overpass area-ID für Relationen
			const iso = e.tags!['ISO3166-2'];
			const name = e.tags!.name ?? iso;
			return { relId, areaId, iso, name };
		});
}

async function fetchLevelForState(state: State, level: number, timeoutSeconds: number) {
	const query = qlLevelInArea(state.areaId, timeoutSeconds, level);
	return DefaultOverpassApi().execQuery(query);
}

function retryOnError<T>(delayMs: number) {
	return retryWhen<T>((errors) =>
		errors.pipe(
			concatMap((e, i) =>
				iif(
					() => i > 3,
					throwError(() => e),
					of(e).pipe(delay(delayMs))
				)
			)
		)
	);
}

export function extractAdministrativeAreas(opts: FetchOptions) {
	const { timeoutSeconds, throttleMs, levelsPerState, includedStates } = opts;

	return from(fetchStates(timeoutSeconds)).pipe(
		retryOnError(throttleMs),
		delay(throttleMs),
		concatMap((states) =>
			from(states).pipe(
				filter((state) => includedStates.includes(state.iso)),
				concatMap((state) =>
					from(levelsPerState).pipe(
						concatMap((level) =>
							from(fetchLevelForState(state, level, timeoutSeconds)).pipe(
								tap(() => console.log(`fetching administrative level ${level} of ${state.name}`)),
								retryOnError(throttleMs),
								delay(throttleMs)
							)
						)
					)
				)
			)
		)
	);
}

extractAdministrativeAreas(envSchema.parse(process.env))
	.pipe(
		map((e) =>
			osmtogeojson(e)
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
				})
		),
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
				}
			});
		},
		error: (err) => {
			console.error(err);
			DefaultOverpassApi()
				.status()
				.then((v) => console.log(v));
		}
	});
