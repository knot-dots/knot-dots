import { expect, test } from 'vitest';
import {
	containerCopyRequest,
	isServerOwnedCopyRelationPredicate,
	selectContainerCopyLocation
} from '$lib/containerCopy';
import { payloadTypes } from '$lib/models';

const sourceGuid = '00000000-0000-4000-8000-000000000001';
const organizationGuid = '00000000-0000-4000-8000-000000000002';

test('accepts only the operation-specific copy request fields', () => {
	expect(
		containerCopyRequest.safeParse({
			operation: 'copy',
			sourceGuid,
			targetOrganizationGuid: organizationGuid,
			targetOrganizationalUnitGuid: null,
			rootPayload: { title: 'Edited', type: payloadTypes.enum.text }
		}).success
	).toBe(true);
	expect(
		containerCopyRequest.safeParse({
			operation: 'individual-profile',
			sourceGuid,
			creatorGuid: sourceGuid
		}).success
	).toBe(false);
	expect(
		containerCopyRequest.safeParse({
			operation: 'copy',
			sourceGuid,
			targetOrganizationGuid: organizationGuid,
			targetOrganizationalUnitGuid: null,
			rootPayload: { title: 'Edited', type: payloadTypes.enum.text },
			relation: [{ object: sourceGuid, predicate: 'is-copy-of' }]
		}).success
	).toBe(false);
});

test('recognizes only server-owned copy provenance predicates', () => {
	expect(isServerOwnedCopyRelationPredicate('is-copy-of')).toBe(true);
	expect(isServerOwnedCopyRelationPredicate('is-individual-profile-of')).toBe(true);
	expect(isServerOwnedCopyRelationPredicate('is-part-of')).toBe(false);
});

test('prefers the current copy location when creation is allowed there', () => {
	const currentLocation = {
		organizationGuid,
		organizationalUnitGuid: null
	};
	const fallbackOrganizationGuid = '00000000-0000-4000-8000-000000000003';

	expect(
		selectContainerCopyLocation(
			currentLocation,
			fallbackOrganizationGuid,
			[{ guid: fallbackOrganizationGuid }],
			[],
			() => true
		)
	).toEqual(currentLocation);
});

test('falls back to the first administered organization when the current location is denied', () => {
	const fallbackOrganizationGuid = '00000000-0000-4000-8000-000000000003';

	expect(
		selectContainerCopyLocation(
			{ organizationGuid, organizationalUnitGuid: null },
			fallbackOrganizationGuid,
			[{ guid: fallbackOrganizationGuid }],
			[],
			({ organizationGuid: candidate }) => candidate === fallbackOrganizationGuid
		)
	).toEqual({
		organizationGuid: fallbackOrganizationGuid,
		organizationalUnitGuid: null
	});
});

test('resolves an administered organizational unit as the fallback location', () => {
	const fallbackOrganizationGuid = '00000000-0000-4000-8000-000000000003';
	const fallbackOrganizationalUnitGuid = '00000000-0000-4000-8000-000000000004';

	expect(
		selectContainerCopyLocation(
			{ organizationGuid, organizationalUnitGuid: null },
			fallbackOrganizationalUnitGuid,
			[],
			[
				{
					guid: fallbackOrganizationalUnitGuid,
					organization: fallbackOrganizationGuid
				}
			],
			({ organizationalUnitGuid }) => organizationalUnitGuid === fallbackOrganizationalUnitGuid
		)
	).toEqual({
		organizationGuid: fallbackOrganizationGuid,
		organizationalUnitGuid: fallbackOrganizationalUnitGuid
	});
});

test('returns no copy location when neither current nor fallback creation is allowed', () => {
	expect(
		selectContainerCopyLocation(
			{ organizationGuid, organizationalUnitGuid: null },
			'00000000-0000-4000-8000-000000000003',
			[{ guid: '00000000-0000-4000-8000-000000000003' }],
			[],
			() => false
		)
	).toBeUndefined();
});
