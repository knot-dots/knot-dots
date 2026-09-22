import { beforeEach, expect, test, vi } from 'vitest';
import { emptyGrantRecords, type AnyPayload, type Container } from '$lib/models';

const getManyContainersWithES = vi.hoisted(() => vi.fn());

vi.mock('$lib/server/elasticsearch', () => ({ getManyContainersWithES }));

import { searchMcpContainers } from '$lib/server/mcp/containers';

const organizationGuid = '00000000-0000-4000-8000-000000000001';
const userGuid = '00000000-0000-4000-8000-000000000002';

function goalContainer(
	guid: string,
	{
		summary,
		title,
		visibility = 'organization'
	}: { summary?: string; title: string; visibility?: 'creator' | 'organization' }
): Container<AnyPayload> {
	return {
		guid,
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
			summary,
			template: false,
			title,
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

function memberUser() {
	const grants = emptyGrantRecords();
	grants.subordinates.read.push(organizationGuid);

	return {
		familyName: '',
		givenName: '',
		grants,
		guid: userGuid,
		isAuthenticated: true,
		roles: [],
		settings: {}
	};
}

beforeEach(() => {
	getManyContainersWithES.mockReset();
});

test('searches existing container data and paginates after authorization', async () => {
	const hidden = goalContainer('00000000-0000-4000-8000-000000000003', {
		title: 'Hidden',
		visibility: 'creator'
	});
	const alpha = goalContainer('00000000-0000-4000-8000-000000000004', {
		summary: 'First result',
		title: 'Alpha'
	});
	const bravo = goalContainer('00000000-0000-4000-8000-000000000005', {
		title: 'Bravo'
	});
	getManyContainersWithES.mockResolvedValue({
		containers: [hidden, alpha, bravo],
		facets: {},
		total: 3
	});

	await expect(
		searchMcpContainers({
			assigneeGuids: [userGuid],
			limit: 1,
			offset: 0,
			organizationGuid,
			statuses: ['status.idea'],
			terms: 'result',
			types: ['goal'],
			user: memberUser()
		})
	).resolves.toEqual({
		containers: [
			{
				guid: alpha.guid,
				label: 'Alpha',
				organizationGuid,
				organizationalUnitGuid: null,
				status: 'status.idea',
				summary: 'First result',
				type: 'goal'
			}
		],
		nextOffset: 1
	});
	expect(getManyContainersWithES).toHaveBeenCalledExactlyOnceWith(
		[organizationGuid],
		{
			assignees: [userGuid],
			organizationalUnits: undefined,
			statuses: ['status.idea'],
			template: false,
			terms: 'result',
			type: ['goal']
		},
		'relevance',
		{ includeFacets: false, limit: 250, offset: 0 }
	);
});

test('supports organization-level filtering and an authorized-result offset', async () => {
	const alpha = goalContainer('00000000-0000-4000-8000-000000000004', { title: 'Alpha' });
	const bravo = goalContainer('00000000-0000-4000-8000-000000000005', { title: 'Bravo' });
	getManyContainersWithES.mockResolvedValue({
		containers: [alpha, bravo],
		facets: {},
		total: 2
	});

	await expect(
		searchMcpContainers({
			assigneeGuids: [],
			limit: 1,
			offset: 1,
			organizationGuid,
			organizationalUnitGuid: null,
			statuses: [],
			types: [],
			user: memberUser()
		})
	).resolves.toMatchObject({
		containers: [{ guid: bravo.guid }],
		nextOffset: null
	});
	expect(getManyContainersWithES).toHaveBeenCalledWith(
		[organizationGuid],
		expect.objectContaining({ organizationalUnits: null }),
		'alpha',
		expect.any(Object)
	);
});
