import { afterEach, beforeEach, expect, test, vi } from 'vitest';

const { fetchMock } = vi.hoisted(() => ({ fetchMock: vi.fn() }));

vi.mock('$app/state', () => ({
	page: {
		data: {
			categoryContext: { keys: [] }
		}
	}
}));

import fetchProgramObjectives, {
	groupObjectivesByIndicator
} from '$lib/client/fetchProgramObjectives';
import { anyContainer, type Container, type ObjectivePayload } from '$lib/models';

const organization = '00000000-0000-4000-8000-000000000001';
const programA = '00000000-0000-4000-8000-00000000000a';
const programB = '00000000-0000-4000-8000-00000000000b';
const goal = '00000000-0000-4000-8000-000000000002';
const indicatorX = '00000000-0000-4000-8000-0000000000f1';
const indicatorY = '00000000-0000-4000-8000-0000000000f2';

function container(guid: string, type: string, relation: Container['relation'] = []) {
	return anyContainer.parse({
		guid,
		managed_by: organization,
		organization,
		organizational_unit: null,
		realm: 'realm',
		relation,
		revision: 1,
		valid_currently: true,
		valid_from: new Date(),
		payload: { type, title: guid }
	});
}

function objective(guid: string, indicators: string[]) {
	return container(guid, 'objective', [
		{ object: goal, position: 0, predicate: 'is-part-of', subject: guid },
		...indicators.map((indicator) => ({
			object: indicator,
			position: 0,
			predicate: 'is-objective-for' as const,
			subject: guid
		}))
	]) as Container<ObjectivePayload>;
}

beforeEach(() => {
	fetchMock.mockReset();
	vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
	vi.unstubAllGlobals();
});

test('fetches the objectives below a program', async () => {
	const o1 = objective('00000000-0000-4000-8000-000000000101', [indicatorX]);
	fetchMock.mockResolvedValueOnce(
		new Response(JSON.stringify({ containers: [o1, container(goal, 'goal')] }), {
			headers: { 'Content-Type': 'application/json' }
		})
	);

	const result = await fetchProgramObjectives(programA);

	expect(result.program).toBe(programA);
	expect(result.objectives.map(({ guid }) => guid)).toEqual([o1.guid]);
	const url = new URL(String(fetchMock.mock.calls[0][0]), 'http://localhost');
	expect(url.pathname).toBe('/container/v2');
	expect(url.searchParams.getAll('relatedTo')).toEqual([programA]);
	expect(url.searchParams.getAll('relationType')).toEqual(['is-part-of']);
	expect(url.searchParams.getAll('payloadType')).toEqual(['objective']);
});

test('rejects when the request fails', async () => {
	fetchMock.mockResolvedValueOnce(new Response('nope', { status: 500 }));

	await expect(fetchProgramObjectives(programA)).rejects.toThrow();
});

test('groups objectives by indicator and keeps their program', () => {
	const o1 = objective('00000000-0000-4000-8000-000000000101', [indicatorX]);
	const o2 = objective('00000000-0000-4000-8000-000000000102', [indicatorX, indicatorY]);
	const o3 = objective('00000000-0000-4000-8000-000000000103', []);

	const map = groupObjectivesByIndicator([
		{ program: programA, objectives: [o1, o3] },
		{ program: programB, objectives: [o2] }
	]);

	expect([...map.keys()].sort()).toEqual([indicatorX, indicatorY]);
	expect(map.get(indicatorX)).toEqual([
		{ program: programA, objective: o1 },
		{ program: programB, objective: o2 }
	]);
	expect(map.get(indicatorY)).toEqual([{ program: programB, objective: o2 }]);
});

test('ignores is-objective-for relations pointing at the objective', () => {
	const o1 = objective('00000000-0000-4000-8000-000000000101', []);
	o1.relation.push({
		object: o1.guid,
		position: 0,
		predicate: 'is-objective-for',
		subject: '00000000-0000-4000-8000-000000000999'
	});

	expect(groupObjectivesByIndicator([{ program: programA, objectives: [o1] }]).size).toBe(0);
});
