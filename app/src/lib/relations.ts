import {
	type AnyPayload,
	type Container,
	type Predicate,
	predicates,
	type Relation
} from '$lib/models';

export type Node = Pick<Container<AnyPayload>, 'guid' | 'relation'>;

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

export function hasSection<T extends Container<AnyPayload>>(
	container: { guid: string; relation: Relation[] },
	containers: T[]
): T[] {
	return relatedSubjectNodesByPredicate(container, predicates.enum['is-section-of'], containers);
}

export function sectionOf<T extends Container<AnyPayload>>(
	container: { guid: string; relation: Relation[] },
	containers: T[]
): T | undefined {
	return relatedObjectNodesByPredicate(container, predicates.enum['is-section-of'], containers)[0];
}

export function hasPart<T extends Container<AnyPayload>>(
	container: { guid: string; relation: Relation[] },
	containers: T[]
): T[] {
	return relatedSubjectNodesByPredicate(container, predicates.enum['is-part-of'], containers);
}

export function isPartOf<T extends Container<AnyPayload>>(
	container: { guid: string; relation: Relation[] },
	containers: T[]
): T | undefined {
	return relatedObjectNodesByPredicate(container, predicates.enum['is-part-of'], containers)[0];
}

export function addRelation(subject: Node, predicate: Predicate, object: Node) {
	const position =
		(subject.relation.findLast((r) => r.predicate === predicate)?.position ?? -1) + 1;
	subject.relation = [
		...subject.relation,
		{ subject: subject.guid, predicate, object: object.guid, position }
	];
	object.relation = [
		...object.relation,
		{ subject: subject.guid, predicate, object: object.guid, position }
	];
}
