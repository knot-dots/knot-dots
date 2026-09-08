import { NotFoundError, type DatabasePool } from 'slonik';
import defineAbilityFor from '$lib/authorization';
import {
	templateCopyPreview,
	type ContainerCopyPreviewRequest,
	type ContainerCopyRequest,
	type ContainerCopyRootOperation,
	type TemplateCopyPreview
} from '$lib/containerCopy';
import {
	type AnyPayload,
	type Container,
	getAvailableInProgramGuids,
	isOrganizationContainer,
	isOrganizationalUnitContainer,
	isProgramContainer,
	isTemplateContainer,
	isTemplateRoot,
	predicates,
	visibility
} from '$lib/models';
import {
	CopyPlanError,
	createContainerCopyPlan,
	type CopyReadPolicy,
	type CopyTarget,
	selectContainerCopySources,
	type ContainerCopySourceSelection
} from '$lib/server/containerCopyPlan';
import { persistContainerCopyPlan } from '$lib/server/containerCopyPersistence';
import { getContainerByGuid, getContainerCopyGraph } from '$lib/server/db';
import type { User } from '$lib/stores';

export type ContainerCopyServiceErrorCode =
	| 'source_unavailable'
	| 'invalid_target'
	| 'unsupported_copy_source'
	| 'create_forbidden'
	| 'copy_too_large'
	| 'individual_profile_exists'
	| 'persisted_root_missing';

export class ContainerCopyServiceError extends Error {
	constructor(readonly code: ContainerCopyServiceErrorCode) {
		super(code);
		this.name = 'ContainerCopyServiceError';
	}
}

function rootOperation(request: ContainerCopyRequest): ContainerCopyRootOperation {
	switch (request.operation) {
		case 'copy':
			return { kind: 'copy', rootPayload: request.rootPayload };
		case 'template-instance':
			return { kind: 'template-instance', rootPayload: request.rootPayload };
		case 'create-template':
			return { kind: 'create-template', rootPayload: request.rootPayload };
		case 'individual-profile':
			return { kind: 'individual-profile' };
	}
}

function isIndividualProfile(source: Container<AnyPayload>) {
	return source.relation.some(
		({ predicate, subject }) =>
			predicate === predicates.enum['is-individual-profile-of'] && subject === source.guid
	);
}

function hasExistingIndividualProfile(source: Container<AnyPayload>) {
	return source.relation.some(
		({ object, predicate, subject }) =>
			predicate === predicates.enum['is-individual-profile-of'] &&
			object === source.guid &&
			subject !== source.guid
	);
}

function validateTemplateScope(
	source: Container<AnyPayload>,
	graph: readonly Container<AnyPayload>[],
	availableIn: string | null,
	canRead: (container: Container<AnyPayload>) => boolean
) {
	const availableInGuids = getAvailableInProgramGuids(source);
	if (
		(availableIn === null && availableInGuids.length !== 0) ||
		(availableIn !== null && (availableInGuids.length !== 1 || availableInGuids[0] !== availableIn))
	) {
		throw new ContainerCopyServiceError('source_unavailable');
	}
	if (availableIn !== null) {
		const program = graph.find(({ guid }) => guid === availableIn);
		if (!program || !isProgramContainer(program) || !canRead(program)) {
			throw new ContainerCopyServiceError('source_unavailable');
		}
	}
}

/**
 * A source that becomes unreadable while the plan is built is the same failure as one that was
 * never readable, so both the preview and the copy report it with the same service error.
 */
function rethrowCopyPlanError(caught: unknown): never {
	if (caught instanceof CopyPlanError && caught.code === 'source_unavailable') {
		throw new ContainerCopyServiceError('source_unavailable');
	}
	throw caught;
}

/**
 * Flattens the main copy hierarchy below the root into a depth-annotated outline. Program-scoped
 * template branches stay out of the preview: they are copied as templates, not as instantiated
 * objects, so they never appear as part of the new object.
 */
function previewRows(selection: ContainerCopySourceSelection): TemplateCopyPreview['rows'] {
	const rows: TemplateCopyPreview['rows'] = [];
	const visited = new Set<string>([selection.root.guid]);
	const stack = childrenOf(selection, selection.root.guid, 0);

	while (stack.length > 0) {
		const { guid, depth } = stack.pop()!;
		const container = selection.containersByGuid.get(guid);
		if (visited.has(guid) || !selection.mainHierarchyGuids.has(guid) || !container) {
			continue;
		}
		visited.add(guid);
		rows.push({
			guid,
			depth,
			type: container.payload.type,
			title: 'title' in container.payload ? container.payload.title : container.payload.name
		});
		stack.push(...childrenOf(selection, guid, depth + 1));
	}
	return rows;
}

/**
 * Structural children in reverse display order, so a depth-first pop visits them left to right.
 */
function childrenOf(selection: ContainerCopySourceSelection, guid: string, depth: number) {
	return [...(selection.structuralRelationsByObject.get(guid) ?? [])]
		.sort(
			(a, b) =>
				a.position - b.position ||
				a.predicate.localeCompare(b.predicate) ||
				a.subject.localeCompare(b.subject)
		)
		.reverse()
		.map((relation) => ({ guid: relation.subject, depth }));
}

export async function loadContainerCopyPreview({
	request,
	pool,
	user,
	maxGraphSize,
	maxPreviewSize = maxGraphSize
}: {
	request: ContainerCopyPreviewRequest;
	pool: DatabasePool;
	user: User;
	maxGraphSize: number;
	maxPreviewSize?: number;
}): Promise<TemplateCopyPreview> {
	const graph = await pool.connect(getContainerCopyGraph(request.sourceGuid));
	const source = graph.containers.find(({ guid }) => guid === request.sourceGuid);
	const ability = defineAbilityFor(user);

	if (!source || ability.cannot('read', source) || !isTemplateContainer(source)) {
		throw new ContainerCopyServiceError('source_unavailable');
	}
	if (!isTemplateRoot(source)) {
		throw new ContainerCopyServiceError('source_unavailable');
	}
	if (graph.containers.length > maxGraphSize) {
		throw new ContainerCopyServiceError('copy_too_large');
	}
	validateTemplateScope(source, graph.containers, request.availableIn, (container) =>
		ability.can('read', container)
	);

	let selection;
	try {
		selection = selectContainerCopySources({
			graph,
			canReadSource: (container) => ability.can('read', container)
		});
	} catch (caught) {
		rethrowCopyPlanError(caught);
	}
	if (selection.includedGuids.size > maxPreviewSize) {
		throw new ContainerCopyServiceError('copy_too_large');
	}

	return templateCopyPreview.parse({
		rootGuid: selection.root.guid,
		rows: previewRows(selection)
	});
}

async function loadTarget(
	request: ContainerCopyRequest,
	source: Container<AnyPayload>,
	pool: DatabasePool
) {
	const targetOrganizationGuid =
		request.operation === 'individual-profile'
			? source.organization
			: request.targetOrganizationGuid;

	let organization: Container<AnyPayload>;
	try {
		organization = await pool.connect(getContainerByGuid(targetOrganizationGuid));
	} catch (caught) {
		if (caught instanceof NotFoundError) {
			throw new ContainerCopyServiceError('invalid_target');
		}
		throw caught;
	}
	if (!isOrganizationContainer(organization) || organization.guid !== organization.organization) {
		throw new ContainerCopyServiceError('invalid_target');
	}

	if (request.operation === 'individual-profile') {
		return { organization, organizationalUnit: null };
	}

	if (request.targetOrganizationalUnitGuid === null) {
		return { organization, organizationalUnit: null };
	}

	let organizationalUnit: Container<AnyPayload>;
	try {
		organizationalUnit = await pool.connect(
			getContainerByGuid(request.targetOrganizationalUnitGuid)
		);
	} catch (caught) {
		if (caught instanceof NotFoundError) {
			throw new ContainerCopyServiceError('invalid_target');
		}
		throw caught;
	}
	if (
		!isOrganizationalUnitContainer(organizationalUnit) ||
		organizationalUnit.organization !== organization.guid
	) {
		throw new ContainerCopyServiceError('invalid_target');
	}

	return { organization, organizationalUnit };
}

export async function executeContainerCopy({
	request,
	pool,
	user,
	maxPlanSize,
	maxGraphSize = maxPlanSize
}: {
	request: ContainerCopyRequest;
	pool: DatabasePool;
	user: User;
	maxGraphSize?: number;
	maxPlanSize: number;
}) {
	const graph = await pool.connect(getContainerCopyGraph(request.sourceGuid));
	const source = graph.containers.find(({ guid }) => guid === request.sourceGuid);
	const ability = defineAbilityFor(user);

	if (!source || ability.cannot('read', source)) {
		throw new ContainerCopyServiceError('source_unavailable');
	}
	if (request.operation === 'template-instance') {
		validateTemplateScope(source, graph.containers, request.availableIn, (container) =>
			ability.can('read', container)
		);
	}
	if (isOrganizationContainer(source)) {
		throw new ContainerCopyServiceError('unsupported_copy_source');
	}
	if (
		request.operation === 'create-template' &&
		(!('template' in source.payload) || source.payload.template)
	) {
		throw new ContainerCopyServiceError('unsupported_copy_source');
	}
	if (request.operation === 'individual-profile') {
		if (!isOrganizationalUnitContainer(source)) {
			throw new ContainerCopyServiceError('unsupported_copy_source');
		}
		if (isIndividualProfile(source)) {
			throw new ContainerCopyServiceError('unsupported_copy_source');
		}
		if (hasExistingIndividualProfile(source)) {
			throw new ContainerCopyServiceError('individual_profile_exists');
		}
	}
	if (
		request.operation !== 'individual-profile' &&
		isOrganizationalUnitContainer(source) &&
		request.targetOrganizationalUnitGuid !== null
	) {
		throw new ContainerCopyServiceError('invalid_target');
	}
	if (graph.containers.length > maxGraphSize) {
		throw new ContainerCopyServiceError('copy_too_large');
	}

	const resolvedTarget = await loadTarget(request, source, pool);
	if (ability.cannot('read', resolvedTarget.organization)) {
		throw new ContainerCopyServiceError('invalid_target');
	}
	if (
		resolvedTarget.organizationalUnit &&
		ability.cannot('read', resolvedTarget.organizationalUnit)
	) {
		throw new ContainerCopyServiceError('invalid_target');
	}

	const target: CopyTarget = {
		organization: resolvedTarget.organization.guid,
		organizationalUnit: resolvedTarget.organizationalUnit?.guid ?? null,
		realm: resolvedTarget.organization.realm,
		creatorGuid: user.guid
	};
	const readPolicy: CopyReadPolicy = {
		canReadSource: (container) => ability.can('read', container),
		canRetainCollectionItem: (container, copyTarget) =>
			container.organization === copyTarget.organization && ability.can('read', container),
		canUseNewItemTemplate: (container, copyTarget) => {
			const availableIn = getAvailableInProgramGuids(container);
			if (availableIn.length > 0) {
				return (
					request.operation === 'template-instance' &&
					request.availableIn !== null &&
					availableIn.includes(request.availableIn)
				);
			}
			return (
				container.payload.visibility === visibility.enum.public ||
				container.organization === copyTarget.organization
			);
		}
	};

	let plan;
	try {
		plan = createContainerCopyPlan({
			graph,
			target,
			operation: rootOperation(request),
			readPolicy
		});
	} catch (caught) {
		rethrowCopyPlanError(caught);
	}

	if (plan.size > maxPlanSize) {
		throw new ContainerCopyServiceError('copy_too_large');
	}
	if ([...plan.values()].some((container) => ability.cannot('create', container))) {
		throw new ContainerCopyServiceError('create_forbidden');
	}

	const persisted = await persistContainerCopyPlan(plan)(pool);
	const root = persisted.get(request.sourceGuid);
	if (!root) {
		throw new ContainerCopyServiceError('persisted_root_missing');
	}
	return root;
}
