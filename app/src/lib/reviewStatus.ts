import type { ReviewObjective } from '$lib/client/fetchProgramObjectives';
import { indicatorActualData, indicatorActualDataContainers } from '$lib/indicatorActualData';
import {
	type AnyPayload,
	type BinaryIndicatorPayload,
	type Container,
	type EffectPayload,
	type GoalPayload,
	type IndicatorPayload,
	isBinaryIndicatorContainer,
	isEffectContainer,
	isIndicatorContainer,
	isObjectiveContainer,
	type ObjectivePayload,
	predicates,
	type TrendDirection,
	trendDirection
} from '$lib/models';

export type ReviewStatus =
	| 'review_status.in_target_direction'
	| 'review_status.against_target_direction'
	| 'review_status.no_clear_trend'
	| 'review_status.diverging_targets'
	| 'review_status.no_target'
	| 'review_status.insufficient_data'
	| 'review_status.no_expectation';

// Statuses that tell why an indicator could not be assessed
export function isAssessed(status: ReviewStatus) {
	return (
		status !== 'review_status.no_target' &&
		status !== 'review_status.insufficient_data' &&
		status !== 'review_status.no_expectation'
	);
}

// What an objective aims for: a trend for indicators, whether it is fulfilled
// for binary indicators.
export type Target = TrendDirection | boolean;

// The actual state of an indicator and how to read the target of an objective
// for it, so that both can be compared. The status for a missing actual state
// tells why it is missing.
export type ReviewBasis = {
	actual: Target | undefined;
	missingActual?: ReviewStatus;
	target: (payload: ObjectivePayload) => Target | undefined;
};

// Direction of offsets from the projection of an indicator, such as wanted
// values of objectives: their sum tells whether the indicator should end up
// above or below it. Offsets that are not numbers, e.g. of a cleared input,
// are left out. Undefined without offsets.
export function offsetDirection(offsets: Array<[number, number]>): TrendDirection | undefined {
	const numbers = offsets.filter(([, offset]) => Number.isFinite(offset));
	if (numbers.length === 0) {
		return undefined;
	}
	return Math.sign(numbers.reduce((sum, [, offset]) => sum + offset, 0)) as TrendDirection;
}

// Offsets that point somewhere take precedence over a stored trend direction.
// Offsets that cancel out defer to it, as rows are added with an offset of 0.
function directionOf(
	offsets: Array<[number, number]>,
	trendValue: TrendDirection | undefined
): TrendDirection | undefined {
	const direction = offsetDirection(offsets);
	return direction === undefined || direction === 0 ? (trendValue ?? direction) : direction;
}

// The trend an objective aims for, from its wanted values or its stored trend
// direction.
export function targetTrend(payload: ObjectivePayload): TrendDirection | undefined {
	return directionOf(payload.wantedValues, payload.trendValue);
}

// The trend a measure is expected to cause, from the planned values of an
// effect or its stored trend direction.
export function expectedTrend(payload: EffectPayload): TrendDirection | undefined {
	return directionOf(payload.plannedValues, payload.trendValue);
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
export function computeReviewStatus(
	actual: Target | undefined,
	targets: Target[],
	missingActual: ReviewStatus = 'review_status.insufficient_data'
): ReviewStatus {
	if (targets.length === 0) {
		return 'review_status.no_target';
	}
	if (new Set(targets).size > 1) {
		return 'review_status.diverging_targets';
	}
	if (actual === undefined) {
		return missingActual;
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
	return computeReviewStatus(basis.actual, targetsOf(basis, objectives), basis.missingActual);
}

export type GoalReview = {
	goal: Container<GoalPayload>;
	status: ReviewStatus;
	target: Target | undefined;
};

export type ProgramReview = {
	program: string;
	status: ReviewStatus;
	target: Target | undefined;
	goals: GoalReview[];
};

// The one target that all targets agree on, undefined if there is none
function soleTarget(targets: Target[]) {
	return new Set(targets).size === 1 ? targets[0] : undefined;
}

// Compares an indicator with the objectives of each goal on its own, so the
// goals behind the review of a program can be told apart. Goals without a
// target are left out.
function reviewStatusByGoal(basis: ReviewBasis, objectives: ReviewObjective[]): GoalReview[] {
	const withGoal = objectives.flatMap(({ goal, objective }) => (goal ? [{ goal, objective }] : []));
	return Array.from(Map.groupBy(withGoal, ({ goal }) => goal.guid).values(), (goalObjectives) => {
		const targets = targetsOf(
			basis,
			goalObjectives.map(({ objective }) => objective.payload)
		);
		return {
			goal: goalObjectives[0].goal,
			status: computeReviewStatus(basis.actual, targets, basis.missingActual),
			target: soleTarget(targets)
		};
	}).filter(({ status }) => status !== 'review_status.no_target');
}

// Compares an indicator with the objectives of each program under review on
// its own, and with the objectives of each of its goals. The target is
// undefined when a program has none or diverging ones.
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
				status: computeReviewStatus(basis.actual, targets, basis.missingActual),
				target: soleTarget(targets),
				goals: reviewStatusByGoal(basis, programObjectives)
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
	return review(reviewBasis(indicator, relatedContainers), objectives);
}

// The indicator an objective or effect is about: objectives are objectives
// for it, effects are measured by it.
function indicatorGuidOf(container: Container<EffectPayload> | Container<ObjectivePayload>) {
	const predicate = isEffectContainer(container)
		? predicates.enum['is-measured-by']
		: predicates.enum['is-objective-for'];
	return container.relation.find((r) => r.subject === container.guid && r.predicate === predicate)
		?.object;
}

// The indicator of an objective or effect among the related containers.
export function indicatorOf(
	container: Container<EffectPayload> | Container<ObjectivePayload>,
	relatedContainers: Container<AnyPayload>[]
): Container<BinaryIndicatorPayload> | Container<IndicatorPayload> | undefined {
	const indicatorGuid = indicatorGuidOf(container);
	if (indicatorGuid === undefined) {
		return undefined;
	}
	return relatedContainers
		.filter((c) => isIndicatorContainer(c) || isBinaryIndicatorContainer(c))
		.find(({ guid }) => guid === indicatorGuid);
}

// Reviews an objective or effect against the objectives of the programs under
// review: whether the direction it expects matches the one they want for the
// same indicator. The objective or effect itself is left out, so reviewing
// the program it belongs to does not compare it with itself. Undefined if its
// indicator is not among the related containers or there is nothing to review.
// The related containers are only searched when there is something to review,
// as boards pass all of theirs to every card.
export function reviewObjectiveOrEffect(
	container: Container<EffectPayload> | Container<ObjectivePayload>,
	relatedContainers: Container<AnyPayload>[],
	objectivesByIndicator: Map<string, ReviewObjective[]>
): IndicatorReview | undefined {
	const indicatorGuid = indicatorGuidOf(container);
	const objectives = (
		indicatorGuid === undefined ? [] : (objectivesByIndicator.get(indicatorGuid) ?? [])
	).filter(({ objective }) => objective.guid !== container.guid);
	if (objectives.length === 0) {
		return undefined;
	}
	const indicator = indicatorOf(container, relatedContainers);
	if (!indicator) {
		return undefined;
	}

	const missingActual = 'review_status.no_expectation';
	const basis: ReviewBasis = isBinaryIndicatorContainer(indicator)
		? {
				actual: container.payload.booleanValue,
				missingActual,
				target: ({ booleanValue }) => booleanValue
			}
		: {
				actual: isEffectContainer(container)
					? expectedTrend(container.payload)
					: targetTrend(container.payload),
				missingActual,
				target: targetTrend
			};

	return review(basis, objectives);
}

function review(basis: ReviewBasis, objectives: ReviewObjective[]): IndicatorReview | undefined {
	const status = reviewStatusFor(
		basis,
		objectives.map(({ objective }) => objective.payload)
	);
	return status && { status, programs: reviewStatusByProgram(basis, objectives) };
}
