import resources from '$lib/load/resources';
import type { PageServerLoad } from '../$types';

export const load = resources('alpha') satisfies PageServerLoad;
