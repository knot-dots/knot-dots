import { z } from 'zod';
import { newContainer, predicates, type AnyPayload, type Predicate } from '$lib/models';

const targetedContainerCopyRequest = {
	sourceGuid: z.uuid(),
	targetOrganizationGuid: z.uuid(),
	targetOrganizationalUnitGuid: z.uuid().nullable(),
	rootPayload: newContainer.shape.payload
};

export const containerCopyRequest = z.discriminatedUnion('operation', [
	z.strictObject({
		operation: z.literal('copy'),
		...targetedContainerCopyRequest
	}),
	z.strictObject({
		operation: z.literal('template-instance'),
		...targetedContainerCopyRequest
	}),
	z.strictObject({
		operation: z.literal('individual-profile'),
		sourceGuid: z.uuid()
	})
]);

export type ContainerCopyRequest = z.infer<typeof containerCopyRequest>;

export type PendingContainerCopy =
	| Omit<Extract<ContainerCopyRequest, { operation: 'copy' }>, 'rootPayload'>
	| Omit<Extract<ContainerCopyRequest, { operation: 'template-instance' }>, 'rootPayload'>;

export type ContainerCopyLocation = {
	organizationGuid: string;
	organizationalUnitGuid: string | null;
};

export function selectContainerCopyLocation(
	currentLocation: ContainerCopyLocation,
	firstAdminOfGuid: string | undefined,
	organizations: readonly { guid: string }[],
	organizationalUnits: readonly { guid: string; organization: string }[],
	canCreateAt: (location: ContainerCopyLocation) => boolean
): ContainerCopyLocation | undefined {
	if (canCreateAt(currentLocation)) {
		return currentLocation;
	}

	if (!firstAdminOfGuid) {
		return undefined;
	}

	const organizationalUnit = organizationalUnits.find(({ guid }) => guid === firstAdminOfGuid);
	const fallbackLocation = organizationalUnit
		? {
				organizationGuid: organizationalUnit.organization,
				organizationalUnitGuid: organizationalUnit.guid
			}
		: organizations.some(({ guid }) => guid === firstAdminOfGuid)
			? { organizationGuid: firstAdminOfGuid, organizationalUnitGuid: null }
			: undefined;

	return fallbackLocation && canCreateAt(fallbackLocation) ? fallbackLocation : undefined;
}

export type ContainerCopyRootOperation =
	| { kind: 'copy'; rootPayload: AnyPayload }
	| { kind: 'template-instance'; rootPayload: AnyPayload }
	| { kind: 'individual-profile' };

export const serverOwnedCopyRelationPredicates = [
	predicates.enum['is-copy-of'],
	predicates.enum['is-individual-profile-of']
] as const satisfies readonly Predicate[];
