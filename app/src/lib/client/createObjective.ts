import { _, unwrapFunctionStore } from 'svelte-i18n';
import saveContainer from '$lib/client/saveContainer';
import {
	type BinaryIndicatorPayload,
	type Container,
	containerOfType,
	type IndicatorTemplatePayload,
	type InitialObjectivePayload,
	type IooiType,
	type NewContainer,
	type ObjectivePayload,
	payloadTypes,
	predicates
} from '$lib/models';

export default async function createObjective(
	target: Container,
	indicator: Container<BinaryIndicatorPayload | IndicatorTemplatePayload>,
	iooiType?: IooiType
) {
	const isOverallObjective = target.guid == indicator.guid;
	const newObjective = containerOfType(
		payloadTypes.enum.objective,
		target
	) as NewContainer<InitialObjectivePayload>;

	const response = await saveContainer({
		...newObjective,
		payload: {
			...newObjective.payload,
			title: isOverallObjective
				? unwrapFunctionStore(_)('overall_objective_title', {
						values: { indicator: indicator.payload.title }
					})
				: indicator.payload.title,
			...(iooiType ? { iooiType } : {})
		},
		relation: [
			{
				object: indicator.guid,
				position: 0,
				predicate: predicates.enum['is-objective-for']
			},
			...(isOverallObjective
				? []
				: [
						{
							object: target.guid,
							position: 0,
							predicate: predicates.enum['is-part-of']
						}
					])
		]
	} as NewContainer<ObjectivePayload>);
	return await response.json();
}
