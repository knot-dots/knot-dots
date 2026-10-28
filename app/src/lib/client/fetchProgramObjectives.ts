import fetchContainers from '$lib/client/fetchContainers';
import {
	type Container,
	type GoalPayload,
	isGoalContainer,
	isObjectiveContainer,
	type ObjectivePayload,
	payloadTypes,
	predicates
} from '$lib/models';
import { isPartOf } from '$lib/relations';

export type ProgramObjectives = {
	program: string;
	goals: Container<GoalPayload>[];
	objectives: Container<ObjectivePayload>[];
};

export type ReviewObjective = {
	program: string;
	// The goal the objective is a direct part of
	goal: Container<GoalPayload>;
	objective: Container<ObjectivePayload>;
};

// Loads the objectives of a program and the goals they belong to. The
// is-part-of traversal descends recursively through the program's goals and
// sub-goals to their objectives.
export default async function fetchProgramObjectives(
	program: string,
	init?: RequestInit
): Promise<ProgramObjectives> {
	const containers = await fetchContainers(
		{
			payloadType: [payloadTypes.enum.goal, payloadTypes.enum.objective],
			relatedTo: [program],
			relationType: [predicates.enum['is-part-of']]
		},
		undefined,
		init
	);
	return {
		program,
		goals: containers.filter(isGoalContainer),
		objectives: containers.filter(isObjectiveContainer)
	};
}

// Groups objectives by the indicators they are objectives for, keeping track
// of the program each objective was found in and the goal it belongs to.
// Objectives are left out when their goal is not visible, so the review
// treats them as if they could not be seen either.
export function groupObjectivesByIndicator(programObjectives: ProgramObjectives[]) {
	const map = new Map<string, ReviewObjective[]>();
	for (const { program, goals, objectives } of programObjectives) {
		for (const objective of objectives) {
			const goal = isPartOf(objective, goals);
			if (!goal) {
				continue;
			}
			for (const { object, predicate, subject } of objective.relation) {
				if (predicate !== predicates.enum['is-objective-for'] || subject !== objective.guid) {
					continue;
				}
				if (!map.has(object)) {
					map.set(object, []);
				}
				map.get(object)!.push({ program, goal, objective });
			}
		}
	}
	return map;
}
