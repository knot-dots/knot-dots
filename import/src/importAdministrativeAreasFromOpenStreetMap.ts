import osmtogeojson from 'osmtogeojson';
import { DefaultOverpassApi, type OverpassJsonOutput } from 'overpass-ql-ts';
import { from, iif, of, throwError } from 'rxjs';
import { bufferCount, concatMap, delay, filter, map, retryWhen, tap } from 'rxjs/operators';
import {
	administrativeAreaOpenStreetMap,
	getPool,
	insertIntoAdministrativeAreaOpenStreetMap
} from './db';

type State = {
	relId: number;
	areaId: number;
	iso: string;
	name: string;
};

type FetchOptions = {
	timeoutSeconds?: number;
	throttleMs?: number;
	levelsPerState?: string[];
};

const DEFAULT_TIMEOUT = 240;
const DEFAULT_THROTTLE_MS = 60000;
const DEFAULT_LEVELS_PER_STATE = ['4', '5', '6', '8'];

function qlStates(timeout: number) {
	return `
[out:json][timeout:${timeout}];
rel["boundary"="administrative"]["admin_level"="4"]["ISO3166-2"~"^DE-"];
out ids tags;
`;
}

function qlLevelInArea(areaId: number, timeout: number, level: string) {
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

async function fetchLevelForState(state: State, level: string, timeoutSeconds: number) {
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

export function extractAdministrativeAreas(opts: FetchOptions = {}) {
	const timeoutSeconds = opts.timeoutSeconds ?? DEFAULT_TIMEOUT;
	const throttleMs = opts.throttleMs ?? DEFAULT_THROTTLE_MS;
	const levelsPerState = opts.levelsPerState ?? DEFAULT_LEVELS_PER_STATE;

	return from(fetchStates(timeoutSeconds)).pipe(
		retryOnError(throttleMs),
		delay(throttleMs),
		concatMap((states) =>
			from(states).pipe(
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

extractAdministrativeAreas()
	.pipe(
		map((e) => osmtogeojson(e)),
		concatMap((fc) => fc.features),
		filter((f) => f.properties?.type === 'boundary'),
		filter((f) => f.properties?.boundary === 'administrative'),
		map((f) =>
			administrativeAreaOpenStreetMap.parse({
				boundary: f.geometry,
				name: f.properties?.name,
				official_municipality_key: f.properties?.['de:amtlicher_gemeindeschluessel'],
				official_regional_code: f.properties?.['de:regionalschluessel'],
				relation_id: (f.id as string).split('/')[1],
				wikidata_id: f.properties?.wikidata
			})
		),
		bufferCount(1)
	)
	.subscribe({
		next: async (data) => {
			const pool = await getPool();
			await pool.query(insertIntoAdministrativeAreaOpenStreetMap(data));
		},
		error: (err) => {
			console.error(err);
			DefaultOverpassApi()
				.status()
				.then((v) => console.log(v));
		}
	});
