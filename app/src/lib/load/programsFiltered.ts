import programs from '$lib/load/programs';
import { strategyProgramTypes } from '$lib/workspaces';

/**
 * Calls the shared `programs` loader with the supplied program-type filter
 * forced into the URL search params, regardless of any incoming `programType`
 * query parameter. Returns the loader's strongly typed result.
 */
export function loadProgramsFilteredBy(
	event: { url: URL },
	programTypes: readonly string[]
): ReturnType<typeof programs> {
	const url = new URL(event.url);
	url.searchParams.delete('programType');
	for (const t of programTypes) url.searchParams.append('programType', t);
	return programs({ ...event, url } as Parameters<typeof programs>[0]);
}

export const STRATEGY_PROGRAM_TYPES = strategyProgramTypes;
export const RULES_OF_PROCEDURE_PROGRAM_TYPES = ['program_type.set_of_rules'] as const;
export const GUIDE_PROGRAM_TYPES = ['program_type.guide'] as const;
