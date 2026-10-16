import { expect, test } from 'vitest';
import type { ObjectivePayload } from '$lib/models';
import type { ReviewObjective } from '$lib/client/fetchProgramObjectives';
import {
	computeReviewStatus,
	reviewStatusByProgram,
	reviewStatusFor,
	targetTrend
} from '$lib/reviewStatus';

test.each([
	['matches the target trend', 1, [1, 1], 'review_status.in_target_direction'],
	['matches a flat target trend', 0, [0], 'review_status.in_target_direction'],
	['opposes the target trend', -1, [1], 'review_status.against_target_direction'],
	['deviates from a flat target trend', 1, [0], 'review_status.against_target_direction'],
	['is flat', 0, [-1], 'review_status.no_clear_trend'],
	['faces diverging targets', 1, [1, -1], 'review_status.diverging_targets'],
	['faces diverging targets including a flat one', 0, [0, 1], 'review_status.diverging_targets'],
	['is undetermined', undefined, [1], undefined],
	['has no targets', 1, [], undefined]
] as const)('computeReviewStatus when the actual trend %s', (_, actual, targets, status) => {
	expect(computeReviewStatus(actual, [...targets])).toBe(status);
});

function objective(payload: Pick<ObjectivePayload, 'wantedValues' | 'trendValue'>) {
	return payload as ObjectivePayload;
}

test('targetTrend prefers wanted values over the stored trend', () => {
	const wantedValues: ObjectivePayload['wantedValues'] = [
		[2020, 10],
		[2030, 5]
	];
	expect(targetTrend(objective({ wantedValues, trendValue: 1 }))).toBe(-1);
});

test('targetTrend falls back to the stored trend', () => {
	expect(targetTrend(objective({ wantedValues: [], trendValue: 1 }))).toBe(1);
});

test('targetTrend is undetermined without wanted values or stored trend', () => {
	expect(targetTrend(objective({ wantedValues: [] }))).toBeUndefined();
});

test('reviewStatusFor compares the actual trend with the target trends', () => {
	const actualData: Array<[number, number]> = [
		[2020, 1],
		[2021, 2]
	];
	expect(reviewStatusFor(actualData, [objective({ wantedValues: [], trendValue: 1 })])).toBe(
		'review_status.in_target_direction'
	);
});

function reviewObjective(
	program: string,
	payload: Pick<ObjectivePayload, 'wantedValues' | 'trendValue'>
) {
	return { program, objective: { payload: objective(payload) } } as ReviewObjective;
}

test('reviewStatusByProgram compares the actual trend with each program on its own', () => {
	const actualData: Array<[number, number]> = [
		[2020, 1],
		[2021, 2]
	];
	expect(
		reviewStatusByProgram(actualData, [
			reviewObjective('a', { wantedValues: [], trendValue: 1 }),
			reviewObjective('b', { wantedValues: [], trendValue: -1 }),
			reviewObjective('c', { wantedValues: [], trendValue: 1 }),
			reviewObjective('c', { wantedValues: [], trendValue: -1 }),
			reviewObjective('d', { wantedValues: [] })
		])
	).toEqual([
		{ program: 'a', status: 'review_status.in_target_direction', targetTrend: 1 },
		{ program: 'b', status: 'review_status.against_target_direction', targetTrend: -1 },
		{ program: 'c', status: 'review_status.diverging_targets', targetTrend: undefined },
		{ program: 'd', status: undefined, targetTrend: undefined }
	]);
});
