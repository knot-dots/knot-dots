import { z } from 'zod';
import { createFeatureDecisions } from '$lib/features';
import {
	type AnyPayload,
	type BinaryIndicatorPayload,
	type Container,
	containerOfType,
	effectPayload,
	type EffectPayload,
	type GoalPayload,
	indicatorCategories,
	type IndicatorPayload,
	type IooiType,
	type MeasurePayload,
	type NewContainer,
	objectivePayload,
	type ObjectivePayload,
	payloadTypes,
	predicates
} from '$lib/models';

export type ObjectiveOrEffectType =
	typeof payloadTypes.enum.effect | typeof payloadTypes.enum.objective;

// The kind of the values of an objective or effect is not stored, but inferred
// from them and the type of its indicator; see Card.svelte.
export const valueKinds = z.enum(['tendency', 'series', 'binary']);

export type ValueKind = z.infer<typeof valueKinds>;

const uniqueYears = [
	(values: Array<[number, number]>) => new Set(values.map(([y]) => y)).size === values.length,
	{ message: 'Years must be unique.' }
] as const;

// Unlike a stored effect, a new one must have the value of exactly one kind.
export const effectValue = z.discriminatedUnion('kind', [
	z.object({
		kind: z.literal(valueKinds.enum.tendency),
		trendValue: effectPayload.shape.trendValue.unwrap()
	}),
	z.object({
		kind: z.literal(valueKinds.enum.series),
		plannedValues: effectPayload.shape.plannedValues
			.unwrap()
			.min(1)
			.refine(...uniqueYears),
		achievedValues: effectPayload.shape.achievedValues.unwrap()
	}),
	z.object({
		kind: z.literal(valueKinds.enum.binary),
		booleanValue: effectPayload.shape.booleanValue.unwrap()
	})
]);

export type EffectValue = z.infer<typeof effectValue>;

// Like a new effect, a new objective must have the value of exactly one kind.
export const objectiveValue = z.discriminatedUnion('kind', [
	z.object({
		kind: z.literal(valueKinds.enum.tendency),
		trendValue: objectivePayload.shape.trendValue.unwrap()
	}),
	z.object({
		kind: z.literal(valueKinds.enum.series),
		wantedValues: objectivePayload.shape.wantedValues
			.unwrap()
			.min(1)
			.refine(...uniqueYears)
	}),
	z.object({
		kind: z.literal(valueKinds.enum.binary),
		booleanValue: objectivePayload.shape.booleanValue.unwrap()
	})
]);

export type ObjectiveValue = z.infer<typeof objectiveValue>;

// The value of a new objective or effect, which must fit its type.
export type ObjectiveOrEffectValue =
	| { type: typeof payloadTypes.enum.effect; value: EffectValue }
	| { type: typeof payloadTypes.enum.objective; value: ObjectiveValue };

export function isValidObjectiveOrEffectValue({ type, value }: ObjectiveOrEffectValue) {
	return type === payloadTypes.enum.effect
		? effectValue.safeParse(value).success
		: objectiveValue.safeParse(value).success;
}

export type CreateObjectiveOrEffectRequest = {
	description: string;
	indicator:
		| {
				kind: 'existing';
				container: Container<BinaryIndicatorPayload> | Container<IndicatorPayload>;
		  }
		| {
				kind: 'new';
				container: NewContainer<BinaryIndicatorPayload> | NewContainer<IndicatorPayload>;
		  };
	iooiType?: IooiType;
} & ObjectiveOrEffectValue;

export type CreatedObjectiveOrEffect = {
	indicator: Container<BinaryIndicatorPayload> | Container<IndicatorPayload>;
	item: Container<EffectPayload> | Container<ObjectivePayload>;
};

export function indicatorTypeForValueKind(kind: ValueKind) {
	return kind === valueKinds.enum.binary
		? payloadTypes.enum.binary_indicator
		: payloadTypes.enum.indicator;
}

// The kinds of values that can be defined for an indicator of the given type,
// or for a new indicator if no type is given. Tendencies are still in beta.
export function valueKindOptions({
	features,
	indicatorType,
	mayCreateBinaryIndicator
}: {
	features: string[];
	indicatorType?: typeof payloadTypes.enum.indicator | typeof payloadTypes.enum.binary_indicator;
	mayCreateBinaryIndicator: boolean;
}): ValueKind[] {
	const featureDecisions = createFeatureDecisions(features);

	if (indicatorType === payloadTypes.enum.binary_indicator) {
		return [valueKinds.enum.binary];
	}

	return [
		...(featureDecisions.useTendentialObjectivesAndEffects() ? [valueKinds.enum.tendency] : []),
		valueKinds.enum.series,
		...(indicatorType === undefined && mayCreateBinaryIndicator ? [valueKinds.enum.binary] : [])
	];
}

// The detail view of an effect expects achieved values for exactly the years
// of the planned values.
export function effectValuePayload(
	value: EffectValue
): Partial<
	Pick<EffectPayload, 'achievedValues' | 'booleanValue' | 'plannedValues' | 'trendValue'>
> {
	switch (value.kind) {
		case valueKinds.enum.tendency:
			return { trendValue: value.trendValue };
		case valueKinds.enum.series: {
			const plannedValues = value.plannedValues.toSorted(([a], [b]) => a - b);
			const achievedValues = new Map(value.achievedValues);
			return {
				achievedValues: plannedValues.map(([y]) => [y, achievedValues.get(y) ?? 0]),
				plannedValues
			};
		}
		case valueKinds.enum.binary:
			return { booleanValue: value.booleanValue };
	}
}

// A new indicator lives in the given organization or organizational unit, like
// one created on the indicators page. It takes over the categories of the
// target that apply to indicators, which makes it relevant for similar targets.
export function newIndicatorForObjectiveOrEffect({
	categoryKeys,
	kind,
	scope,
	target,
	title,
	unit
}: {
	categoryKeys: string[];
	kind: ValueKind;
	scope: Container<AnyPayload>;
	target: Container<GoalPayload | MeasurePayload>;
	title: string;
	unit?: string;
}): NewContainer<IndicatorPayload> | NewContainer<BinaryIndicatorPayload> {
	const type = indicatorTypeForValueKind(kind);
	const container = containerOfType(type, scope);

	return {
		...container,
		payload: {
			...container.payload,
			category: Object.fromEntries(
				Object.entries(target.payload.category).filter(([key]) => categoryKeys.includes(key))
			),
			indicatorCategory: [indicatorCategories.enum['indicator_category.custom']],
			title,
			...(type === payloadTypes.enum.indicator ? { unit } : undefined)
		}
	} as NewContainer<IndicatorPayload> | NewContainer<BinaryIndicatorPayload>;
}

export function objectiveValuePayload(
	value: ObjectiveValue
): Partial<Pick<ObjectivePayload, 'booleanValue' | 'trendValue' | 'wantedValues'>> {
	switch (value.kind) {
		case valueKinds.enum.tendency:
			return { trendValue: value.trendValue };
		case valueKinds.enum.series:
			return { wantedValues: value.wantedValues.toSorted(([a], [b]) => a - b) };
		case valueKinds.enum.binary:
			return { booleanValue: value.booleanValue };
	}
}

// Objectives are objectives for their indicator, effects are measured by it.
const indicatorPredicates = {
	[payloadTypes.enum.effect]: predicates.enum['is-measured-by'],
	[payloadTypes.enum.objective]: predicates.enum['is-objective-for']
} as const;

// The containers to create for an objective or effect of the target, to be
// sent to /container/bulk-action/create: a new indicator, if the item needs
// one, followed by the item, which refers to it by its guid. Both get their
// guids here.
export function newObjectiveOrEffectContainers(
	target: Container<GoalPayload | MeasurePayload>,
	request: CreateObjectiveOrEffectRequest
) {
	const { description, indicator, iooiType } = request;
	const indicatorGuid = indicator.kind === 'new' ? crypto.randomUUID() : indicator.container.guid;
	const item = {
		guid: crypto.randomUUID(),
		managed_by: target.managed_by,
		organization: target.organization,
		organizational_unit: target.organizational_unit,
		payload: {
			...(request.type === payloadTypes.enum.effect
				? effectValuePayload(request.value)
				: objectiveValuePayload(request.value)),
			...(description.trim() ? { description } : undefined),
			...(iooiType ? { iooiType } : undefined),
			title: indicator.container.payload.title,
			type: request.type
		},
		realm: target.realm,
		relation: [
			{ object: indicatorGuid, position: 0, predicate: indicatorPredicates[request.type] },
			{ object: target.guid, position: 0, predicate: predicates.enum['is-part-of'] }
		]
	};

	return indicator.kind === 'new'
		? [{ ...indicator.container, guid: indicatorGuid }, item]
		: [item];
}
