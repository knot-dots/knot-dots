import { STRATEGY_PROGRAM_TYPES, loadProgramsFilteredBy } from '$lib/load/programsFiltered';
import type { PageServerLoad } from './$types';

export const load = ((event) =>
	loadProgramsFilteredBy(event, STRATEGY_PROGRAM_TYPES)) satisfies PageServerLoad;
