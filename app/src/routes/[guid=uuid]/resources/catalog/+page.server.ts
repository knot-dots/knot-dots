import tasks from '$lib/load/resources';
import type { PageServerLoad } from '../$types';

export const load = tasks('alpha') satisfies PageServerLoad;
