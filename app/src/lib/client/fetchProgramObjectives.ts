import fetchContainers from '$lib/client/fetchContainers';
import {
	type Container,
	isObjectiveContainer,
	type ObjectivePayload,
	payloadTypes,
	predicates
} from '$lib/models';

export type ProgramObjectives = {
	program: string;
	objectives: Container<ObjectivePayload>[];
};

export type ReviewObjective = {
	program: string;
	objective: Container<ObjectivePayload>;
};

// Loads the objectives of a program. The is-part-of traversal descends
// recursively through the program's goals and sub-goals to their objectives.
export default async function fetchProgramObjectives(
	program: string,
	init?: RequestInit
): Promise<ProgramObjectives> {
	const containers = await fetchContainers(
		{
			payloadType: [payloadTypes.enum.objective],
			relatedTo: [program],
			relationType: [predicates.enum['is-part-of']]
		},
		undefined,
		init
	);
	return { program, objectives: containers.filter(isObjectiveContainer) };
}

// Groups objectives by the indicators they are objectives for, keeping track
// of the program each objective was found in.
export function groupObjectivesByIndicator(programObjectives: ProgramObjectives[]) {
	const map = new Map<string, ReviewObjective[]>();
	for (const { program, objectives } of programObjectives) {
		for (const objective of objectives) {
			for (const { object, predicate, subject } of objective.relation) {
				if (predicate !== predicates.enum['is-objective-for'] || subject !== objective.guid) {
					continue;
				}
				if (!map.has(object)) {
					map.set(object, []);
				}
				map.get(object)!.push({ program, objective });
			}
		}
	}
	return map;
}
