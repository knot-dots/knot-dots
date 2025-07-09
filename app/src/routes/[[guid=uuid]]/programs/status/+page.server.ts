import programs from '$lib/load/programs';
import type { PageServerLoad } from '../$types';

export const load = programs satisfies PageServerLoad;
