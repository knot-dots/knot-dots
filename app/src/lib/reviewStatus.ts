import type { ReviewObjective } from '$lib/client/fetchProgramObjectives';
import { indicatorActualData, indicatorActualDataContainers } from '$lib/indicatorActualData';
import {
	type AnyPayload,
	type BinaryIndicatorPayload,
	type Container,
	type IndicatorPayload,
	isBinaryIndicatorContainer,
	isEffectContainer,
	isObjectiveContainer,
	type ObjectivePayload,
	type TrendDirection,
	trendDirection
} from '$lib/models';

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

// What an objective aims for: a trend for indicators, whether it is fulfilled
// for binary indicators.
export type Target = TrendDirection | boolean;

// The actual state of an indicator and how to read the target of an objective
// for it, so that both can be compared.
export type ReviewBasis = {
	actual: Target | undefined;
	target: (payload: ObjectivePayload) => Target | undefined;
};

// The trend an objective aims for. Concrete wanted values take precedence over
// a stored trend direction.
export function targetTrend(payload: ObjectivePayload): TrendDirection | undefined {
	return trendDirection(payload.wantedValues) ?? payload.trendValue;
}

// Compares the trend of the actual data of an indicator with the target
// trends of objectives, or whether a binary indicator is fulfilled with the
// fulfilment they aim for.
export function reviewBasis(
	indicator: Container<BinaryIndicatorPayload> | Container<IndicatorPayload>,
	relatedContainers: Container<AnyPayload>[]
): ReviewBasis {
	if (isBinaryIndicatorContainer(indicator)) {
		return {
			actual: indicatorActualDataContainers(indicator.guid, relatedContainers).at(0)?.payload
				.booleanValue,
			target: ({ booleanValue }) => booleanValue
		};
	}
	return {
		actual: trendDirection(indicatorActualData(indicator.guid, relatedContainers)),
		target: targetTrend
	};
}

// Compares the actual state of an indicator with the targets of the objectives
// under review. Diverging targets cannot be met at once, so they are reported
// even without actual data.
export function computeReviewStatus(actual: Target | undefined, targets: Target[]): ReviewStatus {
	if (targets.length === 0) {
		return 'review_status.no_target';
	}
	if (new Set(targets).size > 1) {
		return 'review_status.diverging_targets';
	}
	if (actual === undefined) {
		return 'review_status.insufficient_data';
	}
	if (actual === targets[0]) {
		return 'review_status.in_target_direction';
	}
	if (actual === 0) {
		return 'review_status.no_clear_trend';
	}
	return 'review_status.against_target_direction';
}

function targetsOf({ target }: ReviewBasis, objectives: ObjectivePayload[]) {
	return objectives.map(target).filter((t) => t !== undefined);
}

// Compares an indicator with the objectives under review. Undefined if no
// objective is under review.
export function reviewStatusFor(
	basis: ReviewBasis,
	objectives: ObjectivePayload[]
): ReviewStatus | undefined {
	if (objectives.length === 0) {
		return undefined;
	}
	return computeReviewStatus(basis.actual, targetsOf(basis, objectives));
}

export type ProgramReview = {
	program: string;
	status: ReviewStatus;
	target: Target | undefined;
};

// Compares an indicator with the objectives of each program under review on
// its own. The target is undefined when a program has none or diverging ones.
export function reviewStatusByProgram(
	basis: ReviewBasis,
	objectives: ReviewObjective[]
): ProgramReview[] {
	return Array.from(
		Map.groupBy(objectives, ({ program }) => program),
		([program, programObjectives]) => {
			const targets = targetsOf(
				basis,
				programObjectives.map(({ objective }) => objective.payload)
			);
			return {
				program,
				status: computeReviewStatus(basis.actual, targets),
				target: new Set(targets).size === 1 ? targets[0] : undefined
			};
		}
	);
}

export type IndicatorReview = {
	status: ReviewStatus;
	programs: ProgramReview[];
};

// Reviews an indicator against the objectives of the programs under review,
// as a whole and per program. The review compares the indicator with programs
// of others, so it is left out when the organization has set its own targets
// for the indicator. Undefined if there is nothing to review.
export function reviewIndicator(
	indicator: Container<BinaryIndicatorPayload> | Container<IndicatorPayload>,
	relatedContainers: Container<AnyPayload>[],
	objectives: ReviewObjective[]
): IndicatorReview | undefined {
	if (relatedContainers.some((c) => isEffectContainer(c) || isObjectiveContainer(c))) {
		return undefined;
	}
	const basis = reviewBasis(indicator, relatedContainers);
	const status = reviewStatusFor(
		basis,
		objectives.map(({ objective }) => objective.payload)
	);
	return status && { status, programs: reviewStatusByProgram(basis, objectives) };
}
