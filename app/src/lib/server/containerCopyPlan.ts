import { z } from 'zod';
import {
	anyContainer,
	type AnyPayload,
	type Container,
	createDescendantCopyOf,
	createIndividualProfileCopyOf,
	createRootCopyOf,
	createTemplateInstanceOf,
	isOrganizationalUnitContainer,
	type NewContainer,
	newContainer,
	type Predicate,
	payloadTypes,
	predicates,
	relation,
	type Relation,
	type TemplatePayload,
	visibility
} from '$lib/models';
import type { ContainerCopyRootOperation } from '$lib/containerCopy';

export const structuralCopyPredicates = [
	predicates.enum['is-part-of'],
	predicates.enum['is-part-of-program'],
	predicates.enum['is-part-of-measure'],
	predicates.enum['is-part-of-category'],
	predicates.enum['is-section-of']
] as const satisfies readonly Predicate[];

export const referenceCopyPredicates = [
	predicates.enum['is-measured-by'],
	predicates.enum['is-objective-for']
] as const satisfies readonly Predicate[];

const structuralPredicateSet = new Set<string>(structuralCopyPredicates);
const referencePredicateSet = new Set<string>(referenceCopyPredicates);
const uuid = z.uuid();
const newContainerWithGuid = newContainer.extend({ guid: z.uuid(), relation: z.array(relation) });

export type NewContainerWithGuid = z.infer<typeof newContainerWithGuid>;

export type CopyGraphSnapshot = {
	rootGuid: string;
	containers: readonly Container<AnyPayload>[];
};

export type CopyTarget = {
	organization: string;
	organizationalUnit: string | null;
	realm: string;
	creatorGuid: string;
};

export type CopyReadPolicy = {
	canReadSource(container: Container<AnyPayload>): boolean;
	canRetainCollectionItem(container: Container<AnyPayload>, target: CopyTarget): boolean;
	canUseNewItemTemplate(container: Container<AnyPayload>, target: CopyTarget): boolean;
};

export type ContainerCopyPlan = ReadonlyMap<string, NewContainerWithGuid>;

export class CopyPlanError extends Error {
	constructor(
		readonly code:
			| 'source_unavailable'
			| 'required_dependency_unavailable'
			| 'invalid_copy_graph'
			| 'payload_type_mismatch'
			| 'unsupported_copy_source'
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

function requiredPayloadReference(payload: AnyPayload) {
	return payload.type === payloadTypes.enum.resource_data ? payload.resource : undefined;
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

function createRootForOperation(
	root: Container<AnyPayload>,
	target: CopyTarget,
	operation: ContainerCopyRootOperation
) {
	let copy: NewContainer<AnyPayload>;

	switch (operation.kind) {
		case 'copy': {
			if (operation.rootPayload.type !== root.payload.type) {
				throw new CopyPlanError('payload_type_mismatch');
			}
			const editedRoot = { ...root, payload: structuredClone(operation.rootPayload) };
			copy = createRootCopyOf(
				editedRoot,
				target.organization,
				target.organizationalUnit,
				operation.rootPayload.visibility
			);
			break;
		}
		case 'template-instance': {
			if (
				operation.rootPayload.type !== root.payload.type ||
				!('template' in operation.rootPayload)
			) {
				throw new CopyPlanError('payload_type_mismatch');
			}
			if (!('template' in root.payload) || !root.payload.template) {
				throw new CopyPlanError('unsupported_copy_source');
			}
			const editedTemplate = anyContainer.parse({
				...root,
				payload: { ...structuredClone(operation.rootPayload), template: true }
			}) as Container<TemplatePayload>;
			copy = createTemplateInstanceOf(
				editedTemplate,
				target.organization,
				target.organizationalUnit
			);
			break;
		}
		case 'individual-profile':
			if (!isOrganizationalUnitContainer(root)) {
				throw new CopyPlanError('unsupported_copy_source');
			}
			copy = createIndividualProfileCopyOf(root);
			break;
	}

	return newContainer.parse({ ...copy, realm: target.realm });
}

export function createContainerCopyPlan({
	graph,
	target,
	operation,
	readPolicy,
	allocateGuid = () => crypto.randomUUID()
}: {
	graph: CopyGraphSnapshot;
	target: CopyTarget;
	operation: ContainerCopyRootOperation;
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

	if (operation.kind !== 'individual-profile' && operation.rootPayload.type !== root.payload.type) {
		throw new CopyPlanError('payload_type_mismatch');
	}
	if (root.payload.type === payloadTypes.enum.actual_data) {
		throw new CopyPlanError('unsupported_copy_source');
	}

	const hasResolvedReferences = (
		container: Container<AnyPayload>,
		payload: AnyPayload = container.payload
	) => {
		if (
			(relationsBySubject.get(container.guid) ?? []).some(
				(relation) =>
					referencePredicateSet.has(relation.predicate) && !containersByGuid.has(relation.object)
			)
		) {
			return false;
		}

		const payloadReference = requiredPayloadReference(payload);
		return payloadReference === undefined || containersByGuid.has(payloadReference);
	};

	const rootPayload =
		operation.kind === 'individual-profile' ? root.payload : operation.rootPayload;
	if (!hasResolvedReferences(root, rootPayload)) {
		opaqueRequiredDependencyError();
	}
	const plannedRoot = createRootForOperation(root, target, operation);

	// `included` is the copy set; the queue contains readable, eligible containers whose descendants
	// still need to be considered. A cursor avoids repeatedly shifting the array.
	const included = new Set<string>([root.guid]);
	const queue = [root.guid];
	let queueIndex = 0;
	const processed = new Set<string>();

	const includeEligible = (container: Container<AnyPayload>) => {
		// Hidden, actual-data, descendant-resource, and unresolved-reference containers never enter the
		// queue, so their descendants are pruned unless another valid structural path reaches them.
		if (
			!readPolicy.canReadSource(container) ||
			container.payload.type === payloadTypes.enum.actual_data ||
			container.payload.type === payloadTypes.enum.resource_v2 ||
			!hasResolvedReferences(container)
		) {
			return false;
		}
		if (!included.has(container.guid)) {
			included.add(container.guid);
			queue.push(container.guid);
		}
		return true;
	};

	// Expand each included container once. The processed set terminates cycles while `included`
	// deduplicates containers reached through multiple structural paths.
	while (queueIndex < queue.length) {
		const currentGuid = queue[queueIndex++];
		if (processed.has(currentGuid)) {
			continue;
		}
		processed.add(currentGuid);

		for (const relation of structuralRelationsByObject.get(currentGuid) ?? []) {
			const child = containersByGuid.get(relation.subject);
			if (child) {
				includeEligible(child);
			}
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
	const rootVisibility = plannedRoot.payload.visibility;

	const resolveReferenceGuid = (originalGuid: string) => {
		// Definitions reached through an independent structural path are remapped. Reference-only
		// definitions retain their original GUID, regardless of whether the caller may read them.
		const copiedGuid = guidMap.get(originalGuid);
		if (copiedGuid) {
			return copiedGuid;
		}
		if (containersByGuid.has(originalGuid)) {
			return originalGuid;
		}
		return opaqueRequiredDependencyError();
	};

	const copies = orderedOriginalGuids.map((originalGuid) => {
		const source = containersByGuid.get(originalGuid) as Container<AnyPayload>;
		const copiedGuid = guidMap.get(originalGuid) as string;
		// Apply the explicitly selected root operation before reference remapping. Descendants use the
		// ordinary envelope policy and retain their cloned payload data.
		const copy =
			originalGuid === root.guid
				? structuredClone(plannedRoot)
				: createDescendantCopyOf(
						source,
						target.organization,
						descendantOrganizationalUnit,
						rootVisibility
					);
		copy.realm = target.realm;

		copy.user = [
			{
				predicate: predicates.enum['is-creator-of'],
				subject: target.creatorGuid
			}
		];

		// Apply only field-specific container-reference policy here. Geometry UUIDs and ordinary payload
		// data are already handled by the base copy and intentionally remain untouched.
		switch (copy.payload.type) {
			case payloadTypes.enum.resource_data:
				copy.payload.resource = resolveReferenceGuid(copy.payload.resource);
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
		if (originalGuid === root.guid && operation.kind === 'individual-profile') {
			copiedRelations.push({
				object: originalGuid,
				position: 0,
				predicate: predicates.enum['is-individual-profile-of'],
				subject: copiedGuid
			});
		}

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

			if (referencePredicateSet.has(relation.predicate)) {
				// Structurally copied targets are remapped; reference-only targets keep their GUID.
				if (copiedObject) {
					copiedRelations.push({ ...relation, object: copiedObject, subject: copiedGuid });
					continue;
				}
				if (!containersByGuid.has(relation.object)) {
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
		copy.guid = copiedGuid;
		copy.relation = copiedRelations.sort(compareRelations);
		const parseResult = newContainerWithGuid.safeParse(copy);
		if (!parseResult.success) {
			throw new CopyPlanError('invalid_copy_graph');
		}

		return { originalGuid, container: parseResult.data };
	});

	return new Map(copies.map(({ originalGuid, container }) => [originalGuid, container] as const));
}
