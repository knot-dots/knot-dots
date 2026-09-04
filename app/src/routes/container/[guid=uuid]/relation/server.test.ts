import { beforeEach, expect, test, vi } from 'vitest';
import { locale } from 'svelte-i18n';

const deleteManyContainerRelations = vi.hoisted(() => vi.fn());
const getAllContainersRelatedToIndicators = vi.hoisted(() => vi.fn());
const getAllContainersRelatedToMeasure = vi.hoisted(() => vi.fn());
const getAllContainersRelatedToProgram = vi.hoisted(() => vi.fn());
const getAllRelatedContainers = vi.hoisted(() => vi.fn());
const getAllRelatedOrganizationalUnitContainers = vi.hoisted(() => vi.fn());
const getContainerByGuid = vi.hoisted(() => vi.fn());
const getManyContainers = vi.hoisted(() => vi.fn());
const getManyOrganizationContainers = vi.hoisted(() => vi.fn());
const updateManyContainerRelations = vi.hoisted(() => vi.fn());

vi.mock('$lib/server/db', () => ({
	deleteManyContainerRelations,
	getAllContainersRelatedToIndicators,
	getAllContainersRelatedToMeasure,
	getAllContainersRelatedToProgram,
	getAllRelatedContainers,
	getAllRelatedOrganizationalUnitContainers,
	getContainerByGuid,
	getManyContainers,
	getManyOrganizationContainers,
	updateManyContainerRelations
}));

import { POST } from './+server';

locale.set('en');

const containerGuid = '00000000-0000-4000-8000-000000000001';
const sourceGuid = '00000000-0000-4000-8000-000000000002';
const team = '00000000-0000-4000-8000-000000000004';
const otherTeam = '00000000-0000-4000-8000-000000000005';
const user = {
	adminOf: [],
	collaboratorOf: [],
	familyName: 'Admin',
	givenName: 'Test',
	guid: '00000000-0000-4000-8000-000000000003',
	headOf: [],
	isAuthenticated: true,
	memberOf: [],
	roles: ['sysadmin'],
	settings: {}
};

function measure(guid: string, managedBy: string) {
	return {
		guid,
		managed_by: [managedBy],
		organization: otherTeam,
		organizational_unit: null,
		payload: { title: 'Measure', type: 'measure', visibility: 'public' },
		relation: [],
		user: []
	};
}

function postRelation(currentUser: unknown) {
	const request = new Request(`http://localhost/container/${containerGuid}/relation`, {
		method: 'POST',
		body: JSON.stringify([
			{ object: containerGuid, position: 0, predicate: 'is-part-of', subject: sourceGuid }
		]),
		headers: { 'Content-Type': 'application/json' }
	});

	return POST({
		locals: {
			features: [],
			pool: { transaction: vi.fn().mockImplementation((callback) => callback({})) },
			user: currentUser
		},
		params: { guid: containerGuid },
		request
	} as never);
}

beforeEach(() => {
	vi.resetAllMocks();
	updateManyContainerRelations.mockReturnValue(async () => undefined);
	deleteManyContainerRelations.mockReturnValue(async () => undefined);
});

test('the update permission on the route container authorizes a relation', async () => {
	getManyContainers.mockReturnValue(async () => [
		measure(containerGuid, team),
		measure(sourceGuid, otherTeam)
	]);

	const response = await postRelation({ ...user, roles: [], collaboratorOf: [team] });

	expect(response.status).toBe(204);
	expect(updateManyContainerRelations).toHaveBeenCalledWith([
		{
			deleted: false,
			object: containerGuid,
			position: 0,
			predicate: 'is-part-of',
			subject: sourceGuid
		}
	]);
});

test('relations without the update permission on the route container are ignored', async () => {
	// the user may update the other side only — that does not suffice
	getManyContainers.mockReturnValue(async () => [
		measure(containerGuid, otherTeam),
		measure(sourceGuid, team)
	]);

	const response = await postRelation({ ...user, roles: [], collaboratorOf: [team] });

	expect(response.status).toBe(204);
	expect(updateManyContainerRelations).not.toHaveBeenCalled();
	expect(deleteManyContainerRelations).not.toHaveBeenCalled();
});

test.each(['is-copy-of', 'is-individual-profile-of'] as const)(
	'relation updates reject client-supplied %s provenance before writing',
	async (predicate) => {
		const transaction = vi.fn();
		const request = new Request(`http://localhost/container/${containerGuid}/relation`, {
			method: 'POST',
			body: JSON.stringify([
				{ object: sourceGuid, position: 0, predicate, subject: containerGuid }
			]),
			headers: { 'Content-Type': 'application/json' }
		});

		await expect(
			POST({
				locals: { pool: { transaction }, user },
				params: { guid: containerGuid },
				request
			} as never)
		).rejects.toMatchObject({ status: 422 });
		expect(transaction).not.toHaveBeenCalled();
	}
);

test('relation updates reject direct availability changes before writing', async () => {
	const transaction = vi.fn();
	const request = new Request(`http://localhost/container/${containerGuid}/relation`, {
		method: 'POST',
		body: JSON.stringify([
			{
				object: sourceGuid,
				position: 0,
				predicate: 'is-available-in',
				subject: containerGuid
			}
		]),
		headers: { 'Content-Type': 'application/json' }
	});

	await expect(
		POST({
			locals: { pool: { transaction }, user },
			params: { guid: containerGuid },
			request
		} as never)
	).rejects.toMatchObject({ status: 422 });
	expect(transaction).not.toHaveBeenCalled();
});
