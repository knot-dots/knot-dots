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

export type ProgramObjectives = {
	program: string;
	goals: Container<GoalPayload>[];
	objectives: Container<ObjectivePayload>[];
};

export type ReviewObjective = {
	program: string;
	// The goal the objective is a direct part of, unless it is not visible
	goal?: Container<GoalPayload>;
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

function parentGoal(objective: Container<ObjectivePayload>, goals: Container<GoalPayload>[]) {
	const parent = objective.relation.find(
		({ predicate, subject }) =>
			predicate === predicates.enum['is-part-of'] && subject === objective.guid
	)?.object;
	return goals.find(({ guid }) => guid === parent);
}

// Groups objectives by the indicators they are objectives for, keeping track
// of the program each objective was found in and the goal it belongs to.
export function groupObjectivesByIndicator(programObjectives: ProgramObjectives[]) {
	const map = new Map<string, ReviewObjective[]>();
	for (const { program, goals, objectives } of programObjectives) {
		for (const objective of objectives) {
			const goal = parentGoal(objective, goals);
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
