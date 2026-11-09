import { beforeEach, expect, test, vi } from 'vitest';
import type { DatabaseConnection } from 'slonik';

const getAllGrantsByContainers = vi.hoisted(() => vi.fn());
const getAllRelatedUsersByContainers = vi.hoisted(() => vi.fn());
const getContainerByGuid = vi.hoisted(() => vi.fn());
const getManyOrganizationalUnitContainers = vi.hoisted(() => vi.fn());
const getManyTeamContainers = vi.hoisted(() => vi.fn());
const getTeamMembersByTeams = vi.hoisted(() => vi.fn());

vi.mock('$lib/server/db', () => ({
	getAllGrantsByContainers,
	getAllRelatedUsersByContainers,
	getContainerByGuid,
	getManyOrganizationalUnitContainers,
	getManyTeamContainers,
	getTeamMembersByTeams
}));

import { loadMatrixSections } from './matrixSections';
import { anyContainer, type AnyPayload, type Container, type UserGrants } from '$lib/models';

const organizationGuid = '00000000-0000-4000-8000-000000000001';
const unitAboveGuid = '00000000-0000-4000-8000-000000000002';
const unitGuid = '00000000-0000-4000-8000-000000000003';
const programGuid = '00000000-0000-4000-8000-000000000004';
const measureGuid = '00000000-0000-4000-8000-000000000005';

const connection = {} as DatabaseConnection;

function container(
	guid: string,
	payload: Record<string, unknown>,
	organizationalUnit: string | null = null
): Container<AnyPayload> {
	return anyContainer.parse({
		guid,
		managed_by: organizationGuid,
		organization: organizationGuid,
		organizational_unit: organizationalUnit,
		payload,
		realm: 'test',
		revision: 1,
		valid_currently: true,
		valid_from: new Date('2026-01-01T00:00:00.000Z')
	});
}

// only the sources and the dormant area matter to the sections
function grantedFrom(sources: string[], dormant?: string): UserGrants {
	return {
		admin: false,
		dormant,
		member: false,
		organization_manager: false,
		own: [],
		scope_sourced: true,
		self: [],
		source: sources[0],
		sources,
		subordinates: []
	};
}

const organization = container(organizationGuid, { type: 'organization', name: 'Musterhausen' });
const unitAbove = container(unitAboveGuid, {
	type: 'organizational_unit',
	name: 'Gesamtvorstand'
});
const unit = container(unitGuid, { type: 'organizational_unit', name: 'FB 3' });
const program = container(programGuid, { type: 'program', title: 'Klimaprogramm' });

const byGuid: Record<string, Container<AnyPayload>> = {
	[organizationGuid]: organization,
	[unitAboveGuid]: unitAbove,
	[unitGuid]: unit,
	[programGuid]: program
};

function measureIn(unit: string, sources: string[], dormant?: string): Container<AnyPayload> {
	return {
		...container(measureGuid, { type: 'measure', title: 'Baumpflanzung' }, unit),
		user_grant: grantedFrom(sources, dormant)
	};
}

beforeEach(() => {
	getAllGrantsByContainers.mockReset().mockReturnValue(async () => []);
	getAllRelatedUsersByContainers.mockReset().mockReturnValue(async () => []);
	getContainerByGuid.mockReset().mockImplementation((guid: string) => async () => byGuid[guid]);
	getManyOrganizationalUnitContainers.mockReset().mockReturnValue(async () => []);
	getManyTeamContainers.mockReset().mockReturnValue(async () => []);
	getTeamMembersByTeams.mockReset().mockReturnValue(async () => new Map());
});

test('names the unit a content belongs to when the unit above governs it', async () => {
	const { inheritedSections } = await loadMatrixSections(
		connection,
		measureIn(unitGuid, [unitAboveGuid])
	);

	expect(inheritedSections).toHaveLength(1);
	expect(inheritedSections[0].active).toBe(true);
	expect(inheritedSections[0].scope.guid).toBe(unitAboveGuid);
	expect(inheritedSections[0].unit).toEqual({
		guid: unitGuid,
		title: 'FB 3',
		type: 'organizational_unit'
	});
});

test('names the unit when the organization governs it', async () => {
	const { inheritedSections } = await loadMatrixSections(
		connection,
		measureIn(unitGuid, [organizationGuid])
	);

	expect(inheritedSections[0].scope.guid).toBe(organizationGuid);
	expect(inheritedSections[0].unit?.guid).toBe(unitGuid);
});

test('names the unit on the dormant area of a decoupled content', async () => {
	const { inheritedSections } = await loadMatrixSections(
		connection,
		measureIn(unitGuid, [measureGuid], unitAboveGuid)
	);

	expect(inheritedSections).toHaveLength(1);
	expect(inheritedSections[0].active).toBe(false);
	expect(inheritedSections[0].scope.guid).toBe(unitAboveGuid);
	expect(inheritedSections[0].unit?.guid).toBe(unitGuid);
});

test('leaves the section of the own unit as it is', async () => {
	const { inheritedSections } = await loadMatrixSections(
		connection,
		measureIn(unitAboveGuid, [unitAboveGuid])
	);

	expect(inheritedSections[0].scope.guid).toBe(unitAboveGuid);
	expect(inheritedSections[0].unit).toBeUndefined();
});

test('leaves a program section as it is', async () => {
	const { inheritedSections } = await loadMatrixSections(
		connection,
		measureIn(unitGuid, [programGuid])
	);

	expect(inheritedSections[0].scope.guid).toBe(programGuid);
	expect(inheritedSections[0].unit).toBeUndefined();
});

test('leaves the sections of a unit itself as they are', async () => {
	const { inheritedSections } = await loadMatrixSections(connection, {
		...unit,
		user_grant: grantedFrom([unitAboveGuid])
	});

	expect(inheritedSections[0].scope.guid).toBe(unitAboveGuid);
	expect(inheritedSections[0].unit).toBeUndefined();
	expect(getContainerByGuid).not.toHaveBeenCalledWith(unitGuid);
});
