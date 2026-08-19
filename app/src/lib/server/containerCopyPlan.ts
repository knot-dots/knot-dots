import { z } from 'zod';
import {
	type AnyPayload,
	type Container,
	createDescendantCopyOf,
	createRootCopyOf,
	isOrganizationalUnitContainer,
	type NewContainer,
	newContainer,
	type Predicate,
	payloadTypes,
	predicates,
	type Relation,
	type Visibility,
	visibility
} from '$lib/models';

export const structuralCopyPredicates = [
	predicates.enum['is-part-of'],
	predicates.enum['is-part-of-program'],
	predicates.enum['is-part-of-measure'],
	predicates.enum['is-part-of-category'],
	predicates.enum['is-section-of']
] as const satisfies readonly Predicate[];

export const requiredCopyDependencyPredicates = [
	predicates.enum['is-measured-by'],
	predicates.enum['is-objective-for']
] as const satisfies readonly Predicate[];

const structuralPredicateSet = new Set<string>(structuralCopyPredicates);
const requiredDependencyPredicateSet = new Set<string>(requiredCopyDependencyPredicates);
const uuid = z.uuid();

export type CopyGraphSnapshot = {
	rootGuid: string;
	containers: readonly Container<AnyPayload>[];
};

export type CopyTarget = {
	organization: string;
	organizationalUnit: string | null;
	rootVisibility: Visibility;
	creatorGuid: string;
};

export type CopyReadPolicy = {
	canReadSource(container: Container<AnyPayload>): boolean;
	canRetainCollectionItem(container: Container<AnyPayload>, target: CopyTarget): boolean;
	canUseNewItemTemplate(container: Container<AnyPayload>, target: CopyTarget): boolean;
};

export type ContainerCopyPlan = ReadonlyMap<
	string,
	{
		copiedGuid: string;
		container: NewContainer<AnyPayload>;
	}
>;

export class CopyPlanError extends Error {
	constructor(
		readonly code: 'source_unavailable' | 'required_dependency_unavailable' | 'invalid_copy_graph'
	) {
		super(code);
		this.name = 'CopyPlanError';
	}
}

function relationKey({ object, predicate, subject }: Relation) {
	return `${subject}\u0000${predicate}\u0000${object}`;
}

function compareRelations(a: Relation, b: Relation) {
	return (
		a.predicate.localeCompare(b.predicate) ||
		a.position - b.position ||
		a.subject.localeCompare(b.subject) ||
		a.object.localeCompare(b.object)
	);
}

function requiredPayloadDependency(container: Container<AnyPayload>) {
	return container.payload.type === payloadTypes.enum.resource_data
		? container.payload.resource
		: undefined;
}

function normalizeRelations(containers: readonly Container<AnyPayload>[]) {
	const byKey = new Map<string, Relation>();

	for (const container of containers) {
		for (const relation of container.relation) {
			const key = relationKey(relation);
			const existing = byKey.get(key);
			if (existing && existing.position !== relation.position) {
				throw new CopyPlanError('invalid_copy_graph');
			}
			byKey.set(key, relation);
		}
	}

	return [...byKey.values()].sort(compareRelations);
}

function addToIndex(index: Map<string, Relation[]>, guid: string, relation: Relation) {
	const values = index.get(guid);
	if (values) {
		values.push(relation);
	} else {
		index.set(guid, [relation]);
	}
}

function opaqueRequiredDependencyError(): never {
	throw new CopyPlanError('required_dependency_unavailable');
}

export function createContainerCopyPlan({
	graph,
	target,
	readPolicy,
	allocateGuid = () => crypto.randomUUID()
}: {
	graph: CopyGraphSnapshot;
	target: CopyTarget;
	readPolicy: CopyReadPolicy;
	allocateGuid?: () => string;
}): ContainerCopyPlan {
	// The database snapshot may contain copy candidates and reference-only containers. Index every
	// container up front so all later graph and GUID lookups remain constant-time.
	const containersByGuid = new Map(
		graph.containers.map((container) => [container.guid, container])
	);
	const root = containersByGuid.get(graph.rootGuid);

	if (!root || !readPolicy.canReadSource(root)) {
		throw new CopyPlanError('source_unavailable');
	}

	// Relations are attached to both endpoint containers by the database helper. Normalize those
	// duplicates, then index outgoing relations and downward structural edges separately.
	const relations = normalizeRelations(graph.containers);
	const relationsBySubject = new Map<string, Relation[]>();
	const structuralRelationsByObject = new Map<string, Relation[]>();

	for (const relation of relations) {
		addToIndex(relationsBySubject, relation.subject, relation);
		if (structuralPredicateSet.has(relation.predicate)) {
			addToIndex(structuralRelationsByObject, relation.object, relation);
		}
	}

	// `included` is the copy set; the queue contains readable containers whose descendants and
	// dependencies still need to be considered. A cursor avoids repeatedly shifting the array.
	const included = new Set<string>([root.guid]);
	const queue = [root.guid];
	let queueIndex = 0;
	const processed = new Set<string>();

	const includeReadable = (container: Container<AnyPayload>) => {
		// Hidden containers never enter the queue, so their descendants are pruned unless another
		// already-included parent provides a visible path to them.
		if (!readPolicy.canReadSource(container)) {
			return false;
		}
		if (!included.has(container.guid)) {
			included.add(container.guid);
			queue.push(container.guid);
		}
		return true;
	};

	const includeRequiredDependency = (dependencyGuid: string) => {
		// Public dependencies remain shared references. Private dependencies become copy roots of their
		// own and must be readable before their structural descendants may be explored.
		const dependency = containersByGuid.get(dependencyGuid);
		if (!dependency) {
			opaqueRequiredDependencyError();
		}
		if (included.has(dependency.guid) || dependency.payload.visibility === visibility.enum.public) {
			return;
		}
		if (!includeReadable(dependency)) {
			opaqueRequiredDependencyError();
		}
	};

	// Expand each included container once. The processed set terminates cycles while `included`
	// deduplicates containers reached through multiple parents or dependency paths.
	while (queueIndex < queue.length) {
		const currentGuid = queue[queueIndex++];
		if (processed.has(currentGuid)) {
			continue;
		}
		processed.add(currentGuid);

		for (const relation of structuralRelationsByObject.get(currentGuid) ?? []) {
			const child = containersByGuid.get(relation.subject);
			if (child) {
				includeReadable(child);
			}
		}

		for (const relation of relationsBySubject.get(currentGuid) ?? []) {
			if (requiredDependencyPredicateSet.has(relation.predicate)) {
				includeRequiredDependency(relation.object);
			}
		}

		const current = containersByGuid.get(currentGuid) as Container<AnyPayload>;
		const dependencyGuid = requiredPayloadDependency(current);
		if (dependencyGuid) {
			includeRequiredDependency(dependencyGuid);
		}
	}

	// Stabilize the plan independently of database row and relation order: root first, then GUID order.
	const orderedOriginalGuids = [
		root.guid,
		...[...included].filter((guid) => guid !== root.guid).sort()
	];
	const guidMap = new Map<string, string>();
	const allocatedGuids = new Set<string>();

	// Allocate the complete original-to-copy map before transforming any payload or relation. This
	// makes forward references, multiple parents, and cycles independent of creation order.
	for (const originalGuid of orderedOriginalGuids) {
		const copiedGuid = allocateGuid();
		if (
			!uuid.safeParse(copiedGuid).success ||
			allocatedGuids.has(copiedGuid) ||
			containersByGuid.has(copiedGuid)
		) {
			throw new CopyPlanError('invalid_copy_graph');
		}
		allocatedGuids.add(copiedGuid);
		guidMap.set(originalGuid, copiedGuid);
	}

	// Descendants of an organizational-unit root belong to the newly copied unit; other roots retain
	// the organizational-unit target supplied by the caller.
	const copiedRootGuid = guidMap.get(root.guid) as string;
	const descendantOrganizationalUnit = isOrganizationalUnitContainer(root)
		? copiedRootGuid
		: target.organizationalUnit;

	const resolveRequiredPayloadGuid = (originalGuid: string) => {
		// Required payload references must resolve either to a copied private dependency or to the
		// original public dependency. Anything else indicates an incomplete or inaccessible graph.
		const copiedGuid = guidMap.get(originalGuid);
		if (copiedGuid) {
			return copiedGuid;
		}
		const dependency = containersByGuid.get(originalGuid);
		if (dependency?.payload.visibility === visibility.enum.public) {
			return originalGuid;
		}
		return opaqueRequiredDependencyError();
	};

	const copies = orderedOriginalGuids.map((originalGuid) => {
		const source = containersByGuid.get(originalGuid) as Container<AnyPayload>;
		const copiedGuid = guidMap.get(originalGuid) as string;
		// Reuse the single-container copy policy for resets and ownership, then apply the root or
		// descendant visibility rules appropriate to this container's role in the graph.
		const copy =
			originalGuid === root.guid
				? createRootCopyOf(
						source,
						target.organization,
						target.organizationalUnit,
						target.rootVisibility
					)
				: createDescendantCopyOf(
						source,
						target.organization,
						descendantOrganizationalUnit,
						target.rootVisibility
					);

		copy.user = [
			{
				predicate: predicates.enum['is-creator-of'],
				subject: target.creatorGuid
			}
		];

		// Apply only field-specific container-reference policy here. Geometry UUIDs and ordinary payload
		// data are already handled by the base copy and intentionally remain untouched.
		switch (copy.payload.type) {
			case payloadTypes.enum.actual_data:
				copy.payload.indicator = resolveRequiredPayloadGuid(copy.payload.indicator);
				break;
			case payloadTypes.enum.resource_data:
				copy.payload.resource = resolveRequiredPayloadGuid(copy.payload.resource);
				break;
			case payloadTypes.enum.custom_collection:
				copy.payload.item = copy.payload.item.flatMap((itemGuid) => {
					const copiedItemGuid = guidMap.get(itemGuid);
					if (copiedItemGuid) {
						return [copiedItemGuid];
					}
					const item = containersByGuid.get(itemGuid);
					if (!item) {
						return [];
					}
					if (
						item.payload.visibility === visibility.enum.public ||
						(readPolicy.canReadSource(item) && readPolicy.canRetainCollectionItem(item, target))
					) {
						return [itemGuid];
					}
					return [];
				});
				copy.payload.newItemTemplate = copy.payload.newItemTemplate.filter((templateGuid) => {
					const template = containersByGuid.get(templateGuid);
					return Boolean(
						template &&
						'template' in template.payload &&
						template.payload.template &&
						readPolicy.canReadSource(template) &&
						readPolicy.canUseNewItemTemplate(template, target)
					);
				});
				break;
			default:
				break;
		}

		// Rebuild outgoing relations from the complete GUID map. Starting with fresh provenance ensures
		// every copy points directly to its own original rather than inheriting older copy chains.
		const copiedRelations: Relation[] = [
			{
				object: originalGuid,
				position: 0,
				predicate: predicates.enum['is-copy-of'],
				subject: copiedGuid
			}
		];

		for (const relation of relationsBySubject.get(originalGuid) ?? []) {
			if (relation.predicate === predicates.enum['is-copy-of']) {
				continue;
			}

			const copiedObject = guidMap.get(relation.object);
			if (structuralPredicateSet.has(relation.predicate)) {
				// A structural edge survives only when both endpoints are in the pruned copy set.
				if (copiedObject) {
					copiedRelations.push({ ...relation, object: copiedObject, subject: copiedGuid });
				}
				continue;
			}

			if (requiredDependencyPredicateSet.has(relation.predicate)) {
				// Private targets are remapped; public targets keep their original shared GUID.
				if (copiedObject) {
					copiedRelations.push({ ...relation, object: copiedObject, subject: copiedGuid });
					continue;
				}
				const dependency = containersByGuid.get(relation.object);
				if (dependency?.payload.visibility !== visibility.enum.public) {
					opaqueRequiredDependencyError();
				}
				copiedRelations.push({ ...relation, subject: copiedGuid });
				continue;
			}

			// Other relations are internal-only: external and incoming-only relations are dropped.
			if (copiedObject) {
				copiedRelations.push({ ...relation, object: copiedObject, subject: copiedGuid });
			}
		}

		// Validate the fully transformed object so the eventual writer receives complete NewContainers.
		copy.relation = copiedRelations.sort(compareRelations);
		const parseResult = newContainer.safeParse(copy);
		if (!parseResult.success) {
			throw new CopyPlanError('invalid_copy_graph');
		}

		return { originalGuid, copiedGuid, container: parseResult.data };
	});

	return new Map(
		copies.map(({ originalGuid, ...plannedCopy }) => [originalGuid, plannedCopy] as const)
	);
}
