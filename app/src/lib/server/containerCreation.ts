import { error } from '@sveltejs/kit';
import {
	NotFoundError,
	type DatabaseConnection,
	UniqueIntegrityConstraintViolationError
} from 'slonik';
import { _, unwrapFunctionStore } from 'svelte-i18n';
import { z } from 'zod';
import defineAbilityFor from '$lib/authorization';
import { isServerOwnedCopyRelationPredicate } from '$lib/containerCopy';
import { createFeatureDecisions } from '$lib/features';
import {
	grantForNewContainer,
	isStructuralCopyPredicate,
	mayHaveStructuralParent,
	newContainer,
	predicates,
	type Container,
	type AnyPayload
} from '$lib/models';
import { isTemplateScope, requiresScopedTemplate } from '$lib/templateScopes';
import { createContainer, getContainerByGuid, type AfterContainerCreated } from '$lib/server/db';
import type { User } from '$lib/stores';

export type ContainerCreationErrorKind =
	'bad_request' | 'copy_invalid' | 'forbidden' | 'invalid_container' | 'scoped_template_required';

export class ContainerCreationError extends Error {
	constructor(
		public readonly kind: ContainerCreationErrorKind,
		public readonly validationError?: z.ZodError
	) {
		super(kind);
		this.name = 'ContainerCreationError';
	}
}

// Answers a failed creation with the matching HTTP error, or throws again
// what is not a creation error.
export function containerCreationHttpError(caught: unknown): never {
	if (caught instanceof ContainerCreationError) {
		if (caught.kind === 'invalid_container') error(422, caught.validationError!);
		if (caught.kind === 'copy_invalid') {
			error(422, { message: unwrapFunctionStore(_)('error.copy_invalid') });
		}
		if (caught.kind === 'scoped_template_required') {
			error(422, { message: unwrapFunctionStore(_)('error.scoped_template_required') });
		}
		if (caught.kind === 'forbidden') {
			error(403, { message: unwrapFunctionStore(_)('error.forbidden') });
		}
		error(422, { message: unwrapFunctionStore(_)('error.bad_request') });
	}
	if (
		caught instanceof UniqueIntegrityConstraintViolationError &&
		(caught.constraint === 'container_payload_organization_slug_key' ||
			caught.constraint === 'container_payload_organizational_unit_slug_key')
	) {
		error(409, { message: unwrapFunctionStore(_)('error.slug_not_available') });
	}
	throw caught;
}

export function createAuthorizedContainer({
	afterCreate,
	data,
	features,
	user
}: {
	afterCreate?: AfterContainerCreated;
	data: unknown;
	features: string[];
	user: User;
}) {
	const parseResult = newContainer.safeParse(data);
	if (!parseResult.success) {
		throw new ContainerCreationError('invalid_container', parseResult.error);
	}

	if (
		parseResult.data.relation.some(({ predicate }) => isServerOwnedCopyRelationPredicate(predicate))
	) {
		throw new ContainerCreationError('copy_invalid');
	}

	if (
		!mayHaveStructuralParent(parseResult.data.payload.type) &&
		parseResult.data.relation.some(({ predicate }) => isStructuralCopyPredicate(predicate))
	) {
		throw new ContainerCreationError('bad_request');
	}

	if (
		createFeatureDecisions(features).useTemplateWorkspaces() &&
		requiresScopedTemplate(parseResult.data)
	) {
		throw new ContainerCreationError('scoped_template_required');
	}

	const ability = defineAbilityFor(user);

	const availableInRelations = parseResult.data.relation.filter(
		({ predicate }) => predicate === predicates.enum['is-available-in']
	);
	const availabilityGuid = availableInRelations[0]?.object;
	if (availableInRelations.length > 0) {
		const [availability] = availableInRelations;
		if (
			availableInRelations.length !== 1 ||
			availability.subject !== undefined ||
			availabilityGuid === undefined ||
			!('template' in parseResult.data.payload) ||
			parseResult.data.payload.template !== true
		) {
			throw new ContainerCreationError('bad_request');
		}
	}

	return async (connection: DatabaseConnection): Promise<Container<AnyPayload>> => {
		if (availabilityGuid !== undefined) {
			let scope: Container<AnyPayload>;
			try {
				scope = await getContainerByGuid(availabilityGuid)(connection);
			} catch (error) {
				if (error instanceof NotFoundError) {
					throw new ContainerCreationError('bad_request');
				}
				throw error;
			}

			if (!isTemplateScope(scope) || scope.organization !== parseResult.data.organization) {
				throw new ContainerCreationError('bad_request');
			}
			if (ability.cannot('read', scope) || ability.cannot('update', scope)) {
				throw new ContainerCreationError('forbidden');
			}
		}

		// Creating happens within a parent, whose computed grants decide: the
		// container the new one is part of, otherwise its area. Only sysadmins
		// create containers without a parent, such as organizations.
		const hierarchyPredicates: string[] = [
			predicates.enum['is-part-of'],
			predicates.enum['is-part-of-program'],
			predicates.enum['is-part-of-measure'],
			predicates.enum['is-section-of']
		];
		const parentGuid =
			parseResult.data.relation.find(
				({ object, predicate }) => object !== undefined && hierarchyPredicates.includes(predicate)
			)?.object ??
			parseResult.data.organizational_unit ??
			parseResult.data.organization;
		let parent: Container<AnyPayload> | undefined;
		try {
			parent = await getContainerByGuid(parentGuid)(connection);
		} catch (error) {
			if (!(error instanceof NotFoundError)) {
				throw error;
			}
		}
		// The submitted container is tested with the grants derived from its
		// parent. Without a resolvable parent there are no grants, so only the
		// unconditional sysadmin rule passes; the persisted scope must be the one
		// the parent was authorized for.
		if (
			(parent && parseResult.data.organization !== parent.organization) ||
			ability.cannot('create', {
				...parseResult.data,
				...(parent ? { user_grant: grantForNewContainer(parent) } : {})
			})
		) {
			throw new ContainerCreationError('forbidden');
		}

		return createContainer(
			{
				...parseResult.data,
				user: [
					{
						predicate: predicates.enum['is-creator-of'],
						subject: user.guid
					}
				]
			},
			{ afterCreate }
		)(connection);
	};
}
