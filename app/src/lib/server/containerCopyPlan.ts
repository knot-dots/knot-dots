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
	isProgramContainer,
	isStructuralCopyPredicate,
	isTemplateContainer,
	isTemplateRoot,
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
import type { ContainerCopyRootOperation, RootCopyPlacement } from '$lib/containerCopy';

export const referenceCopyPredicates = [
	predicates.enum['is-measured-by'],
	predicates.enum['is-objective-for']
] as const satisfies readonly Predicate[];

const referencePredicateSet = new Set<string>(referenceCopyPredicates);
const uuid = z.uuid();
const newContainerWithGuid = newContainer.extend({ guid: z.uuid(), relation: z.array(relation) });

export type NewContainerWithGuid = z.infer<typeof newContainerWithGuid>;

export type CopyGraphSnapshot = {
	rootGuid: string;
	containers: readonly Container<AnyPayload>[];
};

export type CopyTarget = {
	managedBy: string;
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

export type ContainerCopySourceSelection = {
	containersByGuid: ReadonlyMap<string, Container<AnyPayload>>;
	includedGuids: ReadonlySet<string>;
	mainHierarchyGuids: ReadonlySet<string>;
	relationsBySubject: ReadonlyMap<string, readonly Relation[]>;
	scopedTemplateGuids: ReadonlySet<string>;
	structuralRelationsByObject: ReadonlyMap<string, readonly Relation[]>;
	root: Container<AnyPayload>;
};

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
		case 'create-template': {
			if (
				operation.rootPayload.type !== root.payload.type ||
				!('template' in operation.rootPayload)
			) {
				throw new CopyPlanError('payload_type_mismatch');
			}
			if (!('template' in root.payload) || root.payload.template) {
				throw new CopyPlanError('unsupported_copy_source');
			}
			const editedRoot = { ...root, payload: structuredClone(operation.rootPayload) };
			copy = createRootCopyOf(
				editedRoot,
				target.organization,
				target.organizationalUnit,
				operation.rootPayload.visibility
			);
			if (!('template' in copy.payload)) {
				throw new CopyPlanError('unsupported_copy_source');
			}
			copy.payload = { ...copy.payload, template: true };
			break;
		}
		case 'individual-profile':
			if (!isOrganizationalUnitContainer(root)) {
				throw new CopyPlanError('unsupported_copy_source');
			}
			copy = createIndividualProfileCopyOf(root);
			break;
	}

	return newContainer.parse({ ...copy, managed_by: target.managedBy, realm: target.realm });
}

export function selectContainerCopySources({
	graph,
	canReadSource,
	rootPayload
}: {
	graph: CopyGraphSnapshot;
	canReadSource(container: Container<AnyPayload>): boolean;
	rootPayload?: AnyPayload;
}): ContainerCopySourceSelection {
	// The database snapshot may contain copy candidates and reference-only containers. Index every
	// container up front so all later graph and GUID lookups remain constant-time.
	const containersByGuid = new Map(
		graph.containers.map((container) => [container.guid, container])
	);
	const root = containersByGuid.get(graph.rootGuid);

	if (!root || !canReadSource(root)) {
		throw new CopyPlanError('source_unavailable');
	}
	if (rootPayload && rootPayload.type !== root.payload.type) {
		throw new CopyPlanError('payload_type_mismatch');
	}
	if (root.payload.type === payloadTypes.enum.actual_data) {
		throw new CopyPlanError('unsupported_copy_source');
	}

	// Relations are attached to both endpoint containers by the database helper. Normalize those
	// duplicates, then index outgoing relations and downward structural edges separately.
	const relations = normalizeRelations(graph.containers);
	const relationsBySubject = new Map<string, Relation[]>();
	const structuralRelationsByObject = new Map<string, Relation[]>();

	for (const relation of relations) {
		addToIndex(relationsBySubject, relation.subject, relation);
		if (isStructuralCopyPredicate(relation.predicate)) {
			addToIndex(structuralRelationsByObject, relation.object, relation);
		}
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

	if (!hasResolvedReferences(root, rootPayload ?? root.payload)) {
		opaqueRequiredDependencyError();
	}

	// `included` is the complete copy set. The ordinary hierarchy and program-scoped template
	// hierarchies are expanded separately so template instantiation can keep the latter as templates.
	const includedGuids = new Set<string>([root.guid]);
	const mainHierarchyGuids = new Set<string>([root.guid]);
	const scopedTemplateGuids = new Set<string>();

	const isEligible = (container: Container<AnyPayload>, allowResourceRoot = false) => {
		// Hidden, actual-data, descendant-resource, and unresolved-reference containers never enter the
		// queue, so their descendants are pruned unless another valid structural path reaches them.
		return (
			canReadSource(container) &&
			container.payload.type !== payloadTypes.enum.actual_data &&
			(allowResourceRoot || container.payload.type !== payloadTypes.enum.resource_v2) &&
			hasResolvedReferences(container)
		);
	};

	const mainQueue = [root.guid];
	const processedMain = new Set<string>();
	for (let queueIndex = 0; queueIndex < mainQueue.length; queueIndex++) {
		const currentGuid = mainQueue[queueIndex];
		if (processedMain.has(currentGuid)) {
			continue;
		}
		processedMain.add(currentGuid);

		for (const relation of structuralRelationsByObject.get(currentGuid) ?? []) {
			const child = containersByGuid.get(relation.subject);
			if (child && isEligible(child)) {
				includedGuids.add(child.guid);
				mainHierarchyGuids.add(child.guid);
				mainQueue.push(child.guid);
			}
		}
	}

	const availableTemplateRoots = isProgramContainer(root)
		? [
				...new Map(
					relations
						.filter(
							({ object, predicate }) =>
								object === root.guid && predicate === predicates.enum['is-available-in']
						)
						.flatMap((availability) => {
							const template = containersByGuid.get(availability.subject);
							return template && isTemplateContainer(template) && isTemplateRoot(template)
								? [[template.guid, template] as const]
								: [];
						})
				).values()
			]
		: [];

	const scopedQueue: string[] = [];
	for (const templateRoot of availableTemplateRoots) {
		if (mainHierarchyGuids.has(templateRoot.guid) || !isEligible(templateRoot, true)) {
			continue;
		}
		includedGuids.add(templateRoot.guid);
		scopedTemplateGuids.add(templateRoot.guid);
		scopedQueue.push(templateRoot.guid);
	}

	const processedScoped = new Set<string>();
	for (let queueIndex = 0; queueIndex < scopedQueue.length; queueIndex++) {
		const currentGuid = scopedQueue[queueIndex];
		if (processedScoped.has(currentGuid)) {
			continue;
		}
		processedScoped.add(currentGuid);

		for (const relation of structuralRelationsByObject.get(currentGuid) ?? []) {
			const child = containersByGuid.get(relation.subject);
			if (child && !mainHierarchyGuids.has(child.guid) && isEligible(child)) {
				includedGuids.add(child.guid);
				scopedTemplateGuids.add(child.guid);
				scopedQueue.push(child.guid);
			}
		}
	}

	return {
		containersByGuid,
		includedGuids,
		mainHierarchyGuids,
		relationsBySubject,
		root,
		scopedTemplateGuids,
		structuralRelationsByObject
	};
}

export function createContainerCopyPlan({
	graph,
	target,
	operation,
	readPolicy,
	rootPlacement = [],
	allocateGuid = () => crypto.randomUUID()
}: {
	graph: CopyGraphSnapshot;
	target: CopyTarget;
	operation: ContainerCopyRootOperation;
	readPolicy: CopyReadPolicy;
	rootPlacement?: readonly RootCopyPlacement[];
	allocateGuid?: () => string;
}): ContainerCopyPlan {
	const { containersByGuid, includedGuids, relationsBySubject, root, scopedTemplateGuids } =
		selectContainerCopySources({
			graph,
			canReadSource: readPolicy.canReadSource,
			rootPayload: operation.kind === 'individual-profile' ? undefined : operation.rootPayload
		});
	// Placements are validated against the request by the caller; only template instances carry them.
	if (rootPlacement.length > 0 && operation.kind !== 'template-instance') {
		throw new CopyPlanError('invalid_copy_graph');
	}
	const plannedRoot = createRootForOperation(root, target, operation);

	// Stabilize the plan independently of database row and relation order: root first, then GUID order.
	const orderedOriginalGuids = [
		root.guid,
		...[...includedGuids].filter((guid) => guid !== root.guid).sort()
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

	// An organizational-unit root is managed by the target organization and manages its own
	// descendants; every other copy is managed by the manager the caller resolved.
	const managedByFor = (originalGuid: string) => {
		if (!isOrganizationalUnitContainer(root)) {
			return target.managedBy;
		}
		return originalGuid === root.guid ? target.organization : copiedRootGuid;
	};

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
		// Apply the selected root operation before reference remapping. Descendants use the ordinary
		// envelope policy; explicit template operations then adjust only their template metadata.
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
		copy.managed_by = [managedByFor(originalGuid)];
		if ('template' in copy.payload) {
			if (operation.kind === 'create-template') {
				copy.payload = { ...copy.payload, template: true };
			} else if (operation.kind === 'template-instance') {
				copy.payload = {
					...copy.payload,
					template: scopedTemplateGuids.has(originalGuid)
				};
			}
		}

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
		if (originalGuid === root.guid && operation.kind === 'template-instance') {
			copiedRelations.push(
				...rootPlacement.map(({ parentGuid, position, predicate }) => ({
					object: parentGuid,
					position,
					predicate,
					subject: copiedGuid
				}))
			);
		}

		for (const relation of relationsBySubject.get(originalGuid) ?? []) {
			if (relation.predicate === predicates.enum['is-copy-of']) {
				continue;
			}

			const copiedObject = guidMap.get(relation.object);
			if (isStructuralCopyPredicate(relation.predicate)) {
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
