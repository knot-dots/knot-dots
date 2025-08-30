import knowledge from '$lib/load/knowledge';
import type { PageServerLoad } from '../$types';

export const load = knowledge satisfies PageServerLoad;
