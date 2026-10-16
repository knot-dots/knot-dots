import type { ReviewObjective } from '$lib/client/fetchProgramObjectives';
import { type ObjectivePayload, type TrendDirection, trendDirection } from '$lib/models';

export type ReviewStatus =
	| 'review_status.in_target_direction'
	| 'review_status.against_target_direction'
	| 'review_status.no_clear_trend'
	| 'review_status.diverging_targets'
	| 'review_status.no_target'
	| 'review_status.insufficient_data';

// Statuses that tell why an indicator could not be assessed
export function isAssessed(status: ReviewStatus) {
	return status !== 'review_status.no_target' && status !== 'review_status.insufficient_data';
}

// The trend an objective aims for. Concrete wanted values take precedence over
// a stored trend direction.
export function targetTrend(payload: ObjectivePayload): TrendDirection | undefined {
	return trendDirection(payload.wantedValues) ?? payload.trendValue;
}

// Compares the trend of an indicator's actual data with the target trends of
// the objectives under review. Diverging targets cannot be met at once, so
// they are reported even without enough actual data.
export function computeReviewStatus(
	actualTrend: TrendDirection | undefined,
	targetTrends: TrendDirection[]
): ReviewStatus {
	if (targetTrends.length === 0) {
		return 'review_status.no_target';
	}
	if (new Set(targetTrends).size > 1) {
		return 'review_status.diverging_targets';
	}
	if (actualTrend === undefined) {
		return 'review_status.insufficient_data';
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
// objectives under review. Undefined if no objective is under review.
export function reviewStatusFor(
	actualData: Array<[number, number]>,
	objectives: ObjectivePayload[]
): ReviewStatus | undefined {
	if (objectives.length === 0) {
		return undefined;
	}
	return computeReviewStatus(
		trendDirection(actualData),
		objectives.map(targetTrend).filter((trend) => trend !== undefined)
	);
}

export type ProgramReview = {
	program: string;
	status: ReviewStatus;
	targetTrend: TrendDirection | undefined;
};

// Compares an indicator's actual data with the objectives of each program
// under review on its own. The target trend is undefined when a program has
// no target trend or diverging ones.
export function reviewStatusByProgram(
	actualData: Array<[number, number]>,
	objectives: ReviewObjective[]
): ProgramReview[] {
	const actualTrend = trendDirection(actualData);
	return Array.from(
		Map.groupBy(objectives, ({ program }) => program),
		([program, programObjectives]) => {
			const targetTrends = programObjectives
				.map(({ objective }) => targetTrend(objective.payload))
				.filter((trend) => trend !== undefined);
			return {
				program,
				status: computeReviewStatus(actualTrend, targetTrends),
				targetTrend: new Set(targetTrends).size === 1 ? targetTrends[0] : undefined
			};
		}
	);
}
