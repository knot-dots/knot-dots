import { NotFoundError } from 'slonik';
import { beforeEach, expect, test, vi } from 'vitest';
import { emptyGrantRecords, type AnyPayload, type Container } from '$lib/models';

const getContainerByGuid = vi.hoisted(() => vi.fn());
const loadMcpUserContext = vi.hoisted(() => vi.fn());

vi.mock('$lib/server/db', () => ({ getContainerByGuid }));
vi.mock('$lib/server/elasticsearch', () => ({ getManyContainersWithES: vi.fn() }));
vi.mock('$lib/server/mcp/userContext', () => ({ loadMcpUserContext }));

import { getMcpContainer } from '$lib/server/mcp/containers';

const organizationGuid = '00000000-0000-4000-8000-000000000001';
const userGuid = '00000000-0000-4000-8000-000000000002';
const containerGuid = '00000000-0000-4000-8000-000000000003';

function goalContainer(visibility: 'creator' | 'public'): Container<AnyPayload> {
	return {
		guid: containerGuid,
		managed_by: [organizationGuid],
		organization: organizationGuid,
		organizational_unit: null,
		own_matrix: false,
		payload: {
			aiContribution: 0,
			aiSuggestion: false,
			category: {},
			hierarchyLevel: 1,
			status: 'status.idea',
			template: false,
			title: 'Goal',
			type: 'goal',
			visibility
		},
		realm: 'test',
		relation: [],
		revision: 1,
		user: [],
		valid_currently: true,
		valid_from: new Date('2026-09-22T00:00:00.000Z')
	};
}

beforeEach(() => {
	getContainerByGuid.mockReset();
	loadMcpUserContext.mockReset();
	loadMcpUserContext.mockResolvedValue({
		familyName: '',
		givenName: '',
		grants: emptyGrantRecords(),
		guid: userGuid,
		isAuthenticated: true,
		roles: [],
		settings: {}
	});
});

test('returns a container that the MCP user may read', async () => {
	const container = goalContainer('public');
	getContainerByGuid.mockReturnValue(async () => container);

	await expect(
		getMcpContainer({ guid: containerGuid, userId: userGuid })({} as never)
	).resolves.toBe(container);
});

test('returns null for an inaccessible container', async () => {
	getContainerByGuid.mockReturnValue(async () => goalContainer('creator'));

	await expect(
		getMcpContainer({ guid: containerGuid, userId: userGuid })({} as never)
	).resolves.toBeNull();
});

test('returns null for a missing container', async () => {
	getContainerByGuid.mockReturnValue(async () => {
		throw new NotFoundError('Container not found', { sql: '', values: [] });
	});

	await expect(
		getMcpContainer({ guid: containerGuid, userId: userGuid })({} as never)
	).resolves.toBeNull();
});
