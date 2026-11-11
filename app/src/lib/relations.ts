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

// The directory of allowed relations, read as "subject predicate object": for
// each predicate the payload types a subject of a given payload type may be
// related to. The role matters, a task is part of a measure but not the other
// way around. Predicates without an entry are not restricted yet.
const allowedRelations: Partial<
	Record<Predicate, Partial<Record<PayloadType, readonly PayloadType[]>>>
> = {
	[predicates.enum['is-part-of']]: {
		[payloadTypes.enum.effect]: [
			payloadTypes.enum.goal,
			payloadTypes.enum.measure,
			payloadTypes.enum.simple_measure
		],
		[payloadTypes.enum.goal]: [
			payloadTypes.enum.goal,
			payloadTypes.enum.measure,
			payloadTypes.enum.simple_measure
		],
		[payloadTypes.enum.knowledge]: [payloadTypes.enum.knowledge],
		[payloadTypes.enum.measure]: [payloadTypes.enum.goal, payloadTypes.enum.measure],
		[payloadTypes.enum.objective]: [payloadTypes.enum.goal],
		[payloadTypes.enum.organizational_unit]: [payloadTypes.enum.organizational_unit],
		[payloadTypes.enum.resource]: [payloadTypes.enum.measure, payloadTypes.enum.simple_measure],
		[payloadTypes.enum.resource_data]: [
			payloadTypes.enum.goal,
			payloadTypes.enum.measure,
			payloadTypes.enum.organization,
			payloadTypes.enum.organizational_unit
		],
		[payloadTypes.enum.rule]: [payloadTypes.enum.goal],
		[payloadTypes.enum.simple_measure]: [payloadTypes.enum.goal, payloadTypes.enum.measure],
		[payloadTypes.enum.task]: [
			payloadTypes.enum.goal,
			payloadTypes.enum.measure,
			payloadTypes.enum.simple_measure,
			payloadTypes.enum.task
		],
		[payloadTypes.enum.teaser]: [payloadTypes.enum.teaser_collection],
		[payloadTypes.enum.term]: [payloadTypes.enum.term]
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
