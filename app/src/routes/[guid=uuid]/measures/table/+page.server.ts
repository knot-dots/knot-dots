import measures from '$lib/load/measures';
import type { PageServerLoad } from '../$types';

export const load = (async (event) => measures(event)) satisfies PageServerLoad;
