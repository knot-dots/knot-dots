import { expect, test } from 'vitest';
import { computeReviewStatus } from '$lib/components/NewIndicatorChart.svelte';

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
