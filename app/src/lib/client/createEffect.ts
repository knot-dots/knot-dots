import {
	type BinaryIndicatorPayload,
	type Container,
	containerOfType,
	type IndicatorTemplatePayload,
	type InitialEffectPayload,
	type IooiType,
	type NewContainer,
	payloadTypes,
	predicates
} from '$lib/models';
import saveContainer from '$lib/client/saveContainer';

export default async function createEffect(
	target: Container,
	indicator: Container<BinaryIndicatorPayload | IndicatorTemplatePayload>,
	iooiType?: IooiType
) {
	const newEffect = containerOfType(
		payloadTypes.enum.effect,
		target
	) as NewContainer<InitialEffectPayload>;
	const response = await saveContainer({
		...newEffect,
		payload: {
			...newEffect.payload,
			title: indicator.payload.title,
			...(iooiType ? { iooiType } : {})
		},
		relation: [
			{
				object: indicator.guid,
				position: 0,
				predicate: predicates.enum['is-measured-by']
			},
			{
				object: target.guid,
				position: 0,
				predicate: predicates.enum['is-part-of']
			}
		]
	});
	return await response.json();
}
