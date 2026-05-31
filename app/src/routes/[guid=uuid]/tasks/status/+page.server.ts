import tasks from '$lib/load/tasks';
import type { PageServerLoad } from '../$types';

export const load = tasks('priority', { omitStatusFacet: true }) satisfies PageServerLoad;
