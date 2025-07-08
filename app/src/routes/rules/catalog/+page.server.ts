import rules from '$lib/load/rules';
import type { PageServerLoad } from '../$types';

export const load = rules satisfies PageServerLoad;
