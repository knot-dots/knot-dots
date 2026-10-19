import { expect, test } from 'vitest';
import type { ReviewObjective } from '$lib/client/fetchProgramObjectives';
import type {
	ActualDataPayload,
	BinaryIndicatorPayload,
	Container,
	IndicatorPayload,
	ObjectivePayload
} from '$lib/models';
import {
	computeReviewStatus,
	reviewBasis,
	reviewIndicator,
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
	['is undetermined', undefined, [1], 'review_status.insufficient_data'],
	[
		'is undetermined and faces diverging targets',
		undefined,
		[1, -1],
		'review_status.diverging_targets'
	],
	['has no targets', 1, [], 'review_status.no_target'],
	['is undetermined and has no targets', undefined, [], 'review_status.no_target']
] as const)('computeReviewStatus when the actual trend %s', (_, actual, targets, status) => {
	expect(computeReviewStatus(actual, [...targets])).toBe(status);
});

function objective(
	payload: Pick<ObjectivePayload, 'wantedValues' | 'trendValue' | 'booleanValue'>
) {
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

test.each([
	['is fulfilled as wanted', true, [true], 'review_status.in_target_direction'],
	['is not fulfilled as wanted', false, [false], 'review_status.in_target_direction'],
	['is not fulfilled', false, [true], 'review_status.against_target_direction'],
	['is fulfilled against the targets', true, [false], 'review_status.against_target_direction'],
	['faces diverging targets', true, [true, false], 'review_status.diverging_targets'],
	['has no actual data', undefined, [true], 'review_status.insufficient_data']
] as const)('computeReviewStatus when a binary indicator %s', (_, actual, targets, status) => {
	expect(computeReviewStatus(actual, [...targets])).toBe(status);
});

const indicator = { guid: 'i', payload: { type: 'indicator' } } as Container<IndicatorPayload>;

const binaryIndicator = {
	guid: 'b',
	payload: { type: 'binary_indicator' }
} as Container<BinaryIndicatorPayload>;

function actualData(payload: Partial<ActualDataPayload>) {
	return {
		payload: { type: 'actual_data', values: [], ...payload }
	} as Container<ActualDataPayload>;
}

test('reviewBasis compares the trend of an indicator with target trends', () => {
	const basis = reviewBasis(indicator, [
		actualData({
			indicator: 'i',
			values: [
				[2020, 2],
				[2021, 1]
			]
		})
	]);
	expect(basis.actual).toBe(-1);
	expect(basis.target(objective({ wantedValues: [], trendValue: 1, booleanValue: true }))).toBe(1);
});

test('reviewBasis compares the fulfilment of a binary indicator with wanted fulfilment', () => {
	const basis = reviewBasis(binaryIndicator, [actualData({ indicator: 'b', booleanValue: true })]);
	expect(basis.actual).toBe(true);
	expect(basis.target(objective({ wantedValues: [], trendValue: 1, booleanValue: false }))).toBe(
		false
	);
});

test('reviewBasis has no actual state without actual data', () => {
	expect(reviewBasis(binaryIndicator, []).actual).toBeUndefined();
	expect(reviewBasis(indicator, []).actual).toBeUndefined();
});

const rising = { actual: 1, target: targetTrend } as const;

test('reviewStatusFor compares the actual state with the targets', () => {
	expect(reviewStatusFor(rising, [objective({ wantedValues: [], trendValue: 1 })])).toBe(
		'review_status.in_target_direction'
	);
});

test('reviewStatusFor is undefined without objectives under review', () => {
	expect(reviewStatusFor(rising, [])).toBeUndefined();
});

function reviewObjective(
	program: string,
	payload: Pick<ObjectivePayload, 'wantedValues' | 'trendValue' | 'booleanValue'>
) {
	return { program, objective: { payload: objective(payload) } } as ReviewObjective;
}

test('reviewStatusByProgram compares the actual state with each program on its own', () => {
	expect(
		reviewStatusByProgram(rising, [
			reviewObjective('a', { wantedValues: [], trendValue: 1 }),
			reviewObjective('b', { wantedValues: [], trendValue: -1 }),
			reviewObjective('c', { wantedValues: [], trendValue: 1 }),
			reviewObjective('c', { wantedValues: [], trendValue: -1 }),
			reviewObjective('d', { wantedValues: [] })
		])
	).toEqual([
		{ program: 'a', status: 'review_status.in_target_direction', target: 1 },
		{ program: 'b', status: 'review_status.against_target_direction', target: -1 },
		{ program: 'c', status: 'review_status.diverging_targets', target: undefined },
		{ program: 'd', status: 'review_status.no_target', target: undefined }
	]);
});

test('reviewIndicator reviews a binary indicator', () => {
	expect(
		reviewIndicator(
			binaryIndicator,
			[actualData({ indicator: 'b', booleanValue: false })],
			[reviewObjective('a', { wantedValues: [], booleanValue: true })]
		)
	).toEqual({
		status: 'review_status.against_target_direction',
		programs: [{ program: 'a', status: 'review_status.against_target_direction', target: true }]
	});
});

test('reviewIndicator leaves out indicators with own targets', () => {
	const ownObjective = { payload: { type: 'objective' } } as Container;
	expect(
		reviewIndicator(
			binaryIndicator,
			[ownObjective],
			[reviewObjective('a', { wantedValues: [], booleanValue: true })]
		)
	).toBeUndefined();
});
