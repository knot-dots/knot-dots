import { resource } from 'runed';
import { createContext } from 'svelte';
import fetchProgramObjectives, {
	groupObjectivesByIndicator,
	type ReviewObjective
} from '$lib/client/fetchProgramObjectives';
import type { Container, ProgramPayload } from '$lib/models';

export interface ReviewContext {
	selectedPrograms: Container<ProgramPayload>[];
	readonly objectivesByIndicator: Map<string, ReviewObjective[]>;
	readonly loading: boolean;
	readonly error: Error | undefined;
}

// Holds the programs selected for review and their objectives, grouped by
// indicator. Must be created during component initialization.
export function createReviewContext(): ReviewContext {
	let selectedPrograms = $state.raw<Container<ProgramPayload>[]>([]);

	const objectives = resource(
		() => selectedPrograms.map(({ guid }) => guid),
		(programs, _, { signal }) =>
			Promise.all(programs.map((program) => fetchProgramObjectives(program, { signal })))
	);

	const objectivesByIndicator = $derived(groupObjectivesByIndicator(objectives.current ?? []));

	return {
		get selectedPrograms() {
			return selectedPrograms;
		},
		set selectedPrograms(programs) {
			selectedPrograms = programs;
		},
		get objectivesByIndicator() {
			return objectivesByIndicator;
		},
		get loading() {
			return objectives.loading;
		},
		get error() {
			return objectives.error;
		}
	};
}

export const [getReviewContext, setReviewContext] = createContext<ReviewContext>();
