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
	payloadTypes,
	predicates
} from '$lib/models';

// The kind of an effect is not stored, but inferred from its values and the
// type of its indicator; see Card.svelte and EditableEffectDetailView.svelte.
export const effectKinds = z.enum(['tendency', 'series', 'binary']);

export type EffectKind = z.infer<typeof effectKinds>;

// Unlike a stored effect, a new one must have the value of exactly one kind.
export const effectValue = z.discriminatedUnion('kind', [
	z.object({
		kind: z.literal(effectKinds.enum.tendency),
		trendValue: effectPayload.shape.trendValue.unwrap()
	}),
	z.object({
		kind: z.literal(effectKinds.enum.series),
		plannedValues: effectPayload.shape.plannedValues
			.unwrap()
			.min(1)
			.refine((values) => new Set(values.map(([y]) => y)).size === values.length, {
				message: 'Years must be unique.'
			})
	}),
	z.object({
		kind: z.literal(effectKinds.enum.binary),
		booleanValue: effectPayload.shape.booleanValue.unwrap()
	})
]);

export type EffectValue = z.infer<typeof effectValue>;

export type CreateEffectRequest = {
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
	value: EffectValue;
};

export type CreatedEffect = {
	effect: Container<EffectPayload>;
	indicator: Container<BinaryIndicatorPayload> | Container<IndicatorPayload>;
};

export function indicatorTypeForEffectKind(kind: EffectKind) {
	return kind === effectKinds.enum.binary
		? payloadTypes.enum.binary_indicator
		: payloadTypes.enum.indicator;
}

// The kinds of effects that can be defined for an indicator of the given type,
// or for a new indicator if no type is given. Tendencies and yes/no effects are
// still in beta.
export function effectKindOptions({
	features,
	indicatorType,
	mayCreateBinaryIndicator
}: {
	features: string[];
	indicatorType?: typeof payloadTypes.enum.indicator | typeof payloadTypes.enum.binary_indicator;
	mayCreateBinaryIndicator: boolean;
}): EffectKind[] {
	const featureDecisions = createFeatureDecisions(features);

	if (indicatorType === payloadTypes.enum.binary_indicator) {
		return featureDecisions.useBinaryIndicators() ? [effectKinds.enum.binary] : [];
	}

	return [
		...(featureDecisions.useTendentialObjectivesAndEffects() ? [effectKinds.enum.tendency] : []),
		effectKinds.enum.series,
		...(indicatorType === undefined &&
		featureDecisions.useBinaryIndicators() &&
		mayCreateBinaryIndicator
			? [effectKinds.enum.binary]
			: [])
	];
}

// The detail view of an effect expects achieved values for the same years as
// the planned values.
export function effectValuePayload(
	value: EffectValue
): Partial<
	Pick<EffectPayload, 'achievedValues' | 'booleanValue' | 'plannedValues' | 'trendValue'>
> {
	switch (value.kind) {
		case effectKinds.enum.tendency:
			return { trendValue: value.trendValue };
		case effectKinds.enum.series: {
			const plannedValues = value.plannedValues.toSorted(([a], [b]) => a - b);
			return {
				achievedValues: plannedValues.map(([y]) => [y, 0]),
				plannedValues
			};
		}
		case effectKinds.enum.binary:
			return { booleanValue: value.booleanValue };
	}
}

// A new indicator lives in the given organization or organizational unit, like
// one created on the indicators page. It takes over the categories of the
// target that apply to indicators, which makes it relevant for similar targets.
export function newIndicatorForEffect({
	categoryKeys,
	kind,
	scope,
	target,
	title,
	unit
}: {
	categoryKeys: string[];
	kind: EffectKind;
	scope: Container<AnyPayload>;
	target: Container<GoalPayload | MeasurePayload>;
	title: string;
	unit?: string;
}): NewContainer<IndicatorPayload> | NewContainer<BinaryIndicatorPayload> {
	const type = indicatorTypeForEffectKind(kind);
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

// The containers to create for an effect of the target, to be sent to
// /container/bulk-action/create: a new indicator, if the effect needs one,
// followed by the effect, which refers to it by its guid. Both get their guids
// here.
export function newEffectContainers(
	target: Container<GoalPayload | MeasurePayload>,
	{ description, indicator, iooiType, value }: CreateEffectRequest
) {
	const indicatorGuid = indicator.kind === 'new' ? crypto.randomUUID() : indicator.container.guid;
	const effect = {
		guid: crypto.randomUUID(),
		managed_by: target.managed_by,
		organization: target.organization,
		organizational_unit: target.organizational_unit,
		payload: {
			...effectValuePayload(value),
			description,
			...(iooiType ? { iooiType } : undefined),
			title: indicator.container.payload.title,
			type: payloadTypes.enum.effect
		},
		realm: target.realm,
		relation: [
			{ object: indicatorGuid, position: 0, predicate: predicates.enum['is-measured-by'] },
			{ object: target.guid, position: 0, predicate: predicates.enum['is-part-of'] }
		]
	};

	return indicator.kind === 'new'
		? [{ ...indicator.container, guid: indicatorGuid }, effect]
		: [effect];
}
