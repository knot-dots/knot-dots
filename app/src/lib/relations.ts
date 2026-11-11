import { isServerOwnedCopyRelationPredicate } from '$lib/containerCopy';
import {
	type AnyPayload,
	type Container,
	type PayloadType,
	payloadTypes,
	type Predicate,
	predicates
} from '$lib/models';

export type Node = Pick<Container<AnyPayload>, 'guid' | 'relation'>;

export function isProtectedContainerRelationPredicate(predicate: string) {
	return (
		isServerOwnedCopyRelationPredicate(predicate) ||
		predicate === predicates.enum['is-available-in']
	);
}

// Containers whose detail view shows sections.
export const sectionParentTypes = [
	payloadTypes.enum.event,
	payloadTypes.enum.goal,
	payloadTypes.enum.help,
	payloadTypes.enum.indicator,
	payloadTypes.enum.knowledge,
	payloadTypes.enum.measure,
	payloadTypes.enum.organization,
	payloadTypes.enum.organizational_unit,
	payloadTypes.enum.page,
	payloadTypes.enum.post,
	payloadTypes.enum.program,
	payloadTypes.enum.report,
	payloadTypes.enum.resource_data,
	payloadTypes.enum.resource_v2,
	payloadTypes.enum.rule,
	payloadTypes.enum.simple_measure,
	payloadTypes.enum.task,
	payloadTypes.enum.teaser
] as const satisfies readonly PayloadType[];

const areaTypes = [
	payloadTypes.enum.organization,
	payloadTypes.enum.organizational_unit
] as const satisfies readonly PayloadType[];

const measureTypes = [
	payloadTypes.enum.measure,
	payloadTypes.enum.simple_measure
] as const satisfies readonly PayloadType[];

type AllowedObjectTypes = Partial<Record<PayloadType, readonly PayloadType[]>>;

// The directory of allowed relations, read as "subject predicate object": for
// each predicate the payload types a subject of a given payload type may be
// related to. The role matters, a task is part of a measure but not the other
// way around. Predicates without an entry are not restricted yet.
const allowedRelations: Partial<Record<Predicate, AllowedObjectTypes>> = {
	[predicates.enum['is-part-of']]: {
		[payloadTypes.enum.effect]: [payloadTypes.enum.goal, ...measureTypes],
		[payloadTypes.enum.goal]: [payloadTypes.enum.goal, ...measureTypes],
		[payloadTypes.enum.knowledge]: [payloadTypes.enum.knowledge],
		[payloadTypes.enum.measure]: [payloadTypes.enum.goal, payloadTypes.enum.measure],
		[payloadTypes.enum.objective]: [payloadTypes.enum.goal],
		[payloadTypes.enum.organizational_unit]: [payloadTypes.enum.organizational_unit],
		[payloadTypes.enum.resource]: measureTypes,
		[payloadTypes.enum.resource_data]: [
			payloadTypes.enum.goal,
			payloadTypes.enum.measure,
			...areaTypes
		],
		[payloadTypes.enum.rule]: [payloadTypes.enum.goal],
		[payloadTypes.enum.simple_measure]: [payloadTypes.enum.goal, payloadTypes.enum.measure],
		[payloadTypes.enum.task]: [payloadTypes.enum.goal, ...measureTypes, payloadTypes.enum.task],
		[payloadTypes.enum.teaser]: [payloadTypes.enum.teaser_collection],
		[payloadTypes.enum.term]: [payloadTypes.enum.term]
	},
	[predicates.enum['is-part-of-category']]: {
		[payloadTypes.enum.term]: [payloadTypes.enum.category]
	},
	// Objects of a measure belong to it besides their place in the hierarchy,
	// which scopes templates and workspaces.
	[predicates.enum['is-part-of-measure']]: {
		[payloadTypes.enum.goal]: measureTypes,
		[payloadTypes.enum.measure]: measureTypes,
		[payloadTypes.enum.resource]: measureTypes,
		[payloadTypes.enum.simple_measure]: measureTypes,
		[payloadTypes.enum.task]: measureTypes
	},
	[predicates.enum['is-part-of-program']]: {
		[payloadTypes.enum.goal]: [payloadTypes.enum.program],
		[payloadTypes.enum.knowledge]: [payloadTypes.enum.program],
		[payloadTypes.enum.measure]: [payloadTypes.enum.program],
		[payloadTypes.enum.rule]: [payloadTypes.enum.program],
		[payloadTypes.enum.simple_measure]: [payloadTypes.enum.program]
	},
	[predicates.enum['is-section-of']]: {
		// Sections every container with sections may have.
		[payloadTypes.enum.col_content]: sectionParentTypes,
		[payloadTypes.enum.custom_collection]: sectionParentTypes,
		[payloadTypes.enum.file_collection]: sectionParentTypes,
		[payloadTypes.enum.html]: sectionParentTypes,
		[payloadTypes.enum.image]: sectionParentTypes,
		[payloadTypes.enum.indicator_dashboard]: sectionParentTypes,
		[payloadTypes.enum.info_box]: sectionParentTypes,
		[payloadTypes.enum.quote]: sectionParentTypes,
		[payloadTypes.enum.teaser]: sectionParentTypes,
		[payloadTypes.enum.teaser_highlight]: sectionParentTypes,
		[payloadTypes.enum.text]: sectionParentTypes,
		// Sections of certain containers only.
		[payloadTypes.enum.administrative_area_basic_data]: areaTypes,
		[payloadTypes.enum.chapter]: [payloadTypes.enum.program, payloadTypes.enum.report],
		[payloadTypes.enum.demographic_data]: [payloadTypes.enum.organizational_unit],
		[payloadTypes.enum.effect_collection]: [payloadTypes.enum.goal, payloadTypes.enum.measure],
		[payloadTypes.enum.goal_collection]: measureTypes,
		[payloadTypes.enum.ignite_video]: [
			payloadTypes.enum.event,
			payloadTypes.enum.help,
			payloadTypes.enum.post
		],
		[payloadTypes.enum.indicator_collection]: areaTypes,
		[payloadTypes.enum.map]: areaTypes,
		[payloadTypes.enum.measure_collection]: [...areaTypes, payloadTypes.enum.measure],
		[payloadTypes.enum.objective_collection]: [payloadTypes.enum.goal],
		[payloadTypes.enum.program_collection]: areaTypes,
		[payloadTypes.enum.progress]: [payloadTypes.enum.goal, payloadTypes.enum.measure],
		[payloadTypes.enum.relation_collection]: [payloadTypes.enum.goal, ...measureTypes],
		[payloadTypes.enum.resource_collection]: measureTypes,
		[payloadTypes.enum.resource_data_collection]: [
			payloadTypes.enum.goal,
			payloadTypes.enum.measure
		],
		[payloadTypes.enum.summary]: [
			payloadTypes.enum.event,
			payloadTypes.enum.goal,
			payloadTypes.enum.indicator,
			payloadTypes.enum.knowledge,
			payloadTypes.enum.measure,
			payloadTypes.enum.report,
			payloadTypes.enum.rule
		],
		[payloadTypes.enum.task_collection]: [
			payloadTypes.enum.goal,
			payloadTypes.enum.measure,
			payloadTypes.enum.task
		],
		[payloadTypes.enum.teaser_collection]: [...areaTypes, payloadTypes.enum.page],
		// The parts of a program are sections of it as well.
		[payloadTypes.enum.goal]: [payloadTypes.enum.program],
		[payloadTypes.enum.knowledge]: [payloadTypes.enum.program],
		[payloadTypes.enum.measure]: [payloadTypes.enum.program],
		[payloadTypes.enum.rule]: [payloadTypes.enum.program],
		[payloadTypes.enum.simple_measure]: [payloadTypes.enum.program]
	}
};

export function isAllowedRelation(subject: PayloadType, predicate: string, object: PayloadType) {
	const rules = allowedRelations[predicate as Predicate];
	return rules === undefined || (rules[subject]?.includes(object) ?? false);
}

export function relatedSubjectNodesByPredicate<T extends Node>(
	container: Node,
	predicate: Predicate,
	containers: Array<T>
) {
	return containers
		.filter(({ guid }) => guid !== container.guid)
		.filter(({ guid }) =>
			container.relation
				.filter((relation) => relation.predicate === predicate)
				.some(({ subject }) => subject === guid)
		);
}

export function relatedObjectNodesByPredicate<T extends Node>(
	container: Node,
	predicate: Predicate,
	containers: Array<T>
) {
	return containers
		.filter(({ guid }) => guid !== container.guid)
		.filter(({ guid }) =>
			container.relation
				.filter((relation) => relation.predicate === predicate)
				.some(({ object }) => object === guid)
		);
}

export function hasSection<T extends Container<AnyPayload>>(container: Node, containers: T[]): T[] {
	return relatedSubjectNodesByPredicate(container, predicates.enum['is-section-of'], containers);
}

export function sectionOf<T extends Container<AnyPayload>>(
	container: Node,
	containers: T[]
): T | undefined {
	return relatedObjectNodesByPredicate(container, predicates.enum['is-section-of'], containers)[0];
}

export function hasPart<T extends Container<AnyPayload>>(container: Node, containers: T[]): T[] {
	return relatedSubjectNodesByPredicate(container, predicates.enum['is-part-of'], containers);
}

export function isPartOf<T extends Container<AnyPayload>>(
	container: Node,
	containers: T[]
): T | undefined {
	return relatedObjectNodesByPredicate(container, predicates.enum['is-part-of'], containers)[0];
}

export function addRelation(subject: Node, predicate: Predicate, object: Node) {
	const position =
		(subject.relation.findLast((r) => r.predicate === predicate && r.object === object.guid)
			?.position ?? -1) + 1;
	subject.relation = [
		...subject.relation,
		{ subject: subject.guid, predicate, object: object.guid, position }
	];
	object.relation = [
		...object.relation,
		{ subject: subject.guid, predicate, object: object.guid, position }
	];
}
