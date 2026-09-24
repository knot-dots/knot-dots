import { deepEqual } from 'ts-deep-equal';
import defineAbilityFor from '$lib/authorization';
import {
	getAvailableInScopeGuids,
	isContainerWithEditorialState,
	isIndicatorTemplateContainer,
	isOrganizationContainer,
	type AnyPayload,
	type Container,
	type ModifiedContainer
} from '$lib/models';
import type { User } from '$lib/stores';

export type ContainerUpdateErrorKind = 'forbidden' | 'invalid';

export class ContainerUpdateError extends Error {
	constructor(public readonly kind: ContainerUpdateErrorKind) {
		super(kind);
		this.name = 'ContainerUpdateError';
	}
}

// Checks a payload change of an existing container and returns the payload to
// persist. Relations, users and ownership are validated by the caller.
export function authorizeContainerUpdate({
	current,
	next,
	user
}: {
	current: Container<AnyPayload>;
	next: ModifiedContainer;
	user: User;
}): AnyPayload {
	// Authorization runs against the current container, so the change must not
	// name another one.
	if (next.guid !== current.guid) {
		throw new ContainerUpdateError('invalid');
	}

	const ability = defineAbilityFor(user);
	if (ability.cannot('update', current)) {
		throw new ContainerUpdateError('forbidden');
	}

	if (next.payload.type !== current.payload.type) {
		throw new ContainerUpdateError('invalid');
	}

	if (
		getAvailableInScopeGuids(current).length > 0 &&
		(!('template' in next.payload) || next.payload.template !== true)
	) {
		throw new ContainerUpdateError('invalid');
	}

	if (
		isOrganizationContainer(current) &&
		isOrganizationContainer(next) &&
		next.payload.customDomain !== current.payload.customDomain &&
		ability.cannot('update', current, 'payload.customDomain')
	) {
		throw new ContainerUpdateError('forbidden');
	}
	if (
		isIndicatorTemplateContainer(current) &&
		isIndicatorTemplateContainer(next) &&
		JSON.stringify(next.payload.indicatorCategory) !==
			JSON.stringify(current.payload.indicatorCategory) &&
		ability.cannot('update', current, 'indicatorCategory')
	) {
		throw new ContainerUpdateError('forbidden');
	}
	if (
		isContainerWithEditorialState(current) &&
		isContainerWithEditorialState(next) &&
		next.payload.editorialState !== current.payload.editorialState &&
		ability.cannot('update', current, 'payload.editorialState')
	) {
		throw new ContainerUpdateError('forbidden');
	}

	// A fully AI-generated container becomes a joint work once it is edited.
	if (
		'aiContribution' in current.payload &&
		current.payload.aiContribution == 1 &&
		'aiContribution' in next.payload
	) {
		const { aiContribution: _, ...originalPayload } = current.payload;
		const { aiContribution: __, ...nextPayload } = next.payload;
		return {
			...next.payload,
			aiContribution: deepEqual(originalPayload, nextPayload) ? 1 : 0.5
		} as AnyPayload;
	}

	return next.payload;
}
