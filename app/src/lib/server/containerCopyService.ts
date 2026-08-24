import { NotFoundError, type DatabasePool } from 'slonik';
import defineAbilityFor from '$lib/authorization';
import type { ContainerCopyRequest, ContainerCopyRootOperation } from '$lib/containerCopy';
import {
	type AnyPayload,
	type Container,
	isBinaryIndicatorContainer,
	isIndicatorTemplateContainer,
	isOrganizationContainer,
	isOrganizationalUnitContainer,
	predicates,
	visibility
} from '$lib/models';
import {
	CopyPlanError,
	createContainerCopyPlan,
	type CopyReadPolicy,
	type CopyTarget
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
		case 'individual-profile':
			return { kind: 'individual-profile' };
	}
}

function hasExistingIndividualProfile(source: Container<AnyPayload>) {
	return source.relation.some(
		({ object, predicate, subject }) =>
			predicate === predicates.enum['is-individual-profile-of'] &&
			object === source.guid &&
			subject !== source.guid
	);
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
	maxPlanSize
}: {
	request: ContainerCopyRequest;
	pool: DatabasePool;
	user: User;
	maxPlanSize: number;
}) {
	const graph = await pool.connect(getContainerCopyGraph(request.sourceGuid));
	const source = graph.containers.find(({ guid }) => guid === request.sourceGuid);
	const ability = defineAbilityFor(user);

	if (!source || ability.cannot('read', source)) {
		throw new ContainerCopyServiceError('source_unavailable');
	}
	if (isOrganizationContainer(source)) {
		throw new ContainerCopyServiceError('unsupported_copy_source');
	}
	if (request.operation === 'individual-profile') {
		if (!isOrganizationalUnitContainer(source)) {
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
		canRetainRequiredDependency: (container, copyTarget) =>
			container.organization === copyTarget.organization &&
			(isBinaryIndicatorContainer(container) || isIndicatorTemplateContainer(container)),
		canRetainCollectionItem: (container) => ability.can('read', container),
		canUseNewItemTemplate: (container) =>
			container.payload.visibility === visibility.enum.public || ability.can('read', container)
	};

	let plan;
	try {
		plan = createContainerCopyPlan({
			graph,
			target,
			operation: rootOperation(request),
			readPolicy
		});
	} catch (error) {
		if (error instanceof CopyPlanError && error.code === 'source_unavailable') {
			throw new ContainerCopyServiceError('source_unavailable');
		}
		throw error;
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
