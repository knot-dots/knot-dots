import { expect, test } from 'vitest';
import { indicatorActualData, indicatorActualDataContainers } from '$lib/indicatorActualData';
import { type ActualDataPayload, type Container, payloadTypes } from '$lib/models';

const indicator = '5c4b0a1e-2f3d-4e5f-8a9b-0c1d2e3f4a5b';

function actualData(
	guid: string,
	payload: Partial<ActualDataPayload>
): Container<ActualDataPayload> {
	return {
		guid,
		payload: { indicator, type: payloadTypes.enum.actual_data, values: [], ...payload }
	} as Container<ActualDataPayload>;
}

const own = actualData('own', {
	values: [
		[2021, 7],
		[2023, 9]
	]
});
const sourced = actualData('sourced', {
	source: 'Statistics Office',
	values: [
		[2020, 1],
		[2021, 2],
		[2022, 3]
	]
});
const otherIndicator = actualData('other', { indicator: 'other', values: [[2020, 100]] });

test('indicatorActualDataContainers puts containers with a source first', () => {
	expect(
		indicatorActualDataContainers(indicator, [own, otherIndicator, sourced]).map(({ guid }) => guid)
	).toEqual(['sourced', 'own']);
});

test('indicatorActualData overrides the values of the first container for matching years', () => {
	expect(indicatorActualData(indicator, [own, sourced])).toEqual([
		[2020, 1],
		[2021, 7],
		[2022, 3]
	]);
});

test('indicatorActualData uses the values of a single container', () => {
	expect(indicatorActualData(indicator, [own])).toEqual([
		[2021, 7],
		[2023, 9]
	]);
});

test('indicatorActualData is empty without actual data for the indicator', () => {
	expect(indicatorActualData(indicator, [otherIndicator])).toEqual([]);
});
