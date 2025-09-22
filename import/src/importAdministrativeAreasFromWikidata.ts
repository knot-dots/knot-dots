import { createHash } from 'node:crypto';
import { Observable, timer, throwError } from 'rxjs';
import { mergeMap, catchError, map, tap } from 'rxjs/operators';
import { fromFetch } from 'rxjs/fetch';
import {
	administrativeAreaWikidata,
	AdministrativeAreaWikidata,
	getPool,
	insertIntoAdministrativeAreaWikidata
} from './db';

type WdqsValue = { type: string; value: string };

type WdqsBinding = Record<string, WdqsValue>;

type WdqsResponse = {
	head: { vars: string[] };
	results: { bindings: WdqsBinding[] };
};

const WDQS_ENDPOINT = 'https://query.wikidata.org/sparql';
const USER_AGENT = 'knotdots.net/fetch';
const BASE_BACKOFF_MS = 1000;

function fetchWdqs$(query: string): Observable<WdqsResponse> {
	return fromFetch(WDQS_ENDPOINT, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/sparql-query; charset=utf-8',
			Accept: 'application/sparql-results+json',
			'User-Agent': USER_AGENT
		},
		body: query
	}).pipe(
		mergeMap(async (res) => {
			if (res.status === 429 || res.status === 503) {
				const ra = res.headers.get('retry-after');
				const retryAfterSec = ra ? Number(ra) : undefined;
				const err: any = new Error(`WDQS throttled: ${res.status}`);
				err.status = res.status;
				err.retryAfterMs = retryAfterSec ? retryAfterSec * 1000 : undefined;
				throw err;
			}
			if (!res.ok) {
				const text = await res.text().catch(() => '');
				const err: any = new Error(`WDQS error ${res.status}: ${text}`);
				err.status = res.status;
				throw err;
			}
			return res.json() as Promise<WdqsResponse>;
		}),
		catchError((err) => {
			if (err.status === 429 || err.status === 503) {
				const retryAfterSec = err.retryAfterMs ?? BASE_BACKOFF_MS;
				return timer(retryAfterSec).pipe(mergeMap(() => fetchWdqs$(query)));
			}
			return throwError(() => err);
		})
	);
}

function buildQuery() {
	return `
SELECT
  ?entity ?entityLabel ?country ?officialRegionalCode ?officialMunicipalityKey ?area ?population ?coatOfArms ?openStreetMapRelationId (STR(?entity) AS ?wikidata)
WHERE {
  VALUES ?country { "de" }

  ?entity wdt:P17           wd:Q183.
  ?entity wdt:P31/wdt:P279* wd:Q387917.

  OPTIONAL { ?entity wdt:P439  ?officialMunicipalityKey. }
  OPTIONAL { ?entity wdt:P402  ?openStreetMapRelationId. }
  OPTIONAL { ?entity wdt:P94   ?coatOfArms. }
  OPTIONAL { ?entity wdt:P1388 ?officialRegionalCode. }

  SERVICE wikibase:label { bd:serviceParam wikibase:language "de". }
}
`;
}

function stringOrUndefined(v?: WdqsValue): string | undefined {
	return v?.value;
}

function numberOrUndefined(v?: WdqsValue): number | undefined {
	if (!v?.value) {
		return undefined;
	}
	const n = Number(v.value);
	return Number.isFinite(n) ? n : undefined;
}

function extractQid(uri: string): string {
	// extrahiert z. B. "Q64" aus "http://www.wikidata.org/entity/Q64"
	const m = uri.match(/\/(Q\d+)(?:[#/?].*)?$/);
	return m ? m[1] : uri;
}

function coatOfArmsUrl(url: string) {
	const fileName = url.split('/').slice(-1).join('');

	if (fileName == '') {
		return fileName;
	}

	const sanitizedFileName = decodeURIComponent(fileName).replaceAll(' ', '_');
	const md5sum = createHash('md5').update(sanitizedFileName).digest('hex');
	const pathSegments = [
		'wikipedia',
		'commons',
		md5sum.substring(0, 1),
		md5sum.substring(0, 2),
		sanitizedFileName
	];
	return `https://upload.wikimedia.org/${pathSegments.join('/')}`;
}

function mapBindingToAdministrativeArea(binding: WdqsBinding): AdministrativeAreaWikidata {
	const wikidataUri =
		stringOrUndefined(binding.wikidata) ?? stringOrUndefined(binding.entity) ?? '';
	const wikidataId = extractQid(wikidataUri);
	const coatOfArms = stringOrUndefined(binding.coatOfArms);

	return administrativeAreaWikidata.parse({
		country: stringOrUndefined(binding.country) as string,
		...(coatOfArms ? { coat_of_arms: coatOfArmsUrl(coatOfArms) } : undefined),
		id: wikidataId,
		name: stringOrUndefined(binding.entityLabel),
		official_regional_code: stringOrUndefined(binding.officialRegionalCode),
		official_municipality_key: stringOrUndefined(binding.officialMunicipalityKey) as string,
		open_street_map_relation_id: numberOrUndefined(binding.openStreetMapRelationId)
	});
}

fetchWdqs$(buildQuery())
	.pipe(
		tap((value) =>
			console.log(`fetched ${value.results.bindings.length} administrative areas from Wikidata`)
		),
		map((value) => value.results.bindings.map(mapBindingToAdministrativeArea))
	)
	.subscribe({
		next: async (data) => {
			const pool = await getPool();
			await pool.query(insertIntoAdministrativeAreaWikidata(data));
		},
		error: (err) => console.error(err)
	});
