import { type ObjectivePayload, type TrendDirection, trendDirection } from '$lib/models';

export type ReviewStatus =
	| 'review_status.in_target_direction'
	| 'review_status.against_target_direction'
	| 'review_status.no_clear_trend'
	| 'review_status.diverging_targets';

// The trend an objective aims for. Concrete wanted values take precedence over
// a stored trend direction.
export function targetTrend(payload: ObjectivePayload): TrendDirection | undefined {
	return trendDirection(payload.wantedValues) ?? payload.trendValue;
}

// Compares the trend of an indicator's actual data with the target trends of
// the objectives under review. Undefined if there is nothing to compare.
export function computeReviewStatus(
	actualTrend: TrendDirection | undefined,
	targetTrends: TrendDirection[]
): ReviewStatus | undefined {
	if (actualTrend === undefined || targetTrends.length === 0) {
		return undefined;
	}
	if (new Set(targetTrends).size > 1) {
		return 'review_status.diverging_targets';
	}
	if (actualTrend === targetTrends[0]) {
		return 'review_status.in_target_direction';
	}
	if (actualTrend === 0) {
		return 'review_status.no_clear_trend';
	}
	return 'review_status.against_target_direction';
}

// Compares an indicator's actual data, as [year, value] pairs, with the
// objectives under review.
export function reviewStatusFor(
	actualData: Array<[number, number]>,
	objectives: ObjectivePayload[]
): ReviewStatus | undefined {
	return computeReviewStatus(
		trendDirection(actualData),
		objectives.map(targetTrend).filter((trend) => trend !== undefined)
	);
}
