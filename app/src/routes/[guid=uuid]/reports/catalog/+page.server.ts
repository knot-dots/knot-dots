import { loadAllFilteredBy } from '$lib/load/allFiltered';
import { payloadTypes } from '$lib/models';
import type { PageServerLoad } from './$types';

export const load = ((event) =>
	loadAllFilteredBy(event, [payloadTypes.enum.report])) satisfies PageServerLoad;
