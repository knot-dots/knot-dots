import indicators from '$lib/load/indicators';
import type { PageServerLoad } from '../$types';

export const load = indicators satisfies PageServerLoad;
