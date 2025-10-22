import { type AnyContainer, type Predicate, predicates, type Relation } from '$lib/models';

export type Node = Pick<AnyContainer, 'guid' | 'relation'>;

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

export function hasSection<T extends AnyContainer>(
	container: { guid: string; relation: Relation[] },
	containers: T[]
): T[] {
	return relatedSubjectNodesByPredicate(container, predicates.enum['is-section-of'], containers);
}

export function sectionOf<T extends AnyContainer>(
	container: { guid: string; relation: Relation[] },
	containers: T[]
): T | undefined {
	return relatedObjectNodesByPredicate(container, predicates.enum['is-section-of'], containers)[0];
}
