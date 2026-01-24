import { env } from '$env/dynamic/public';
import saveContainer from '$lib/client/saveContainer';
import {
	type BinaryIndicatorPayload,
	type Container,
	containerOfType,
	type IndicatorPayload,
	type InitialEffectPayload,
	type IooiType,
	type NewContainer,
	payloadTypes,
	predicates
} from '$lib/models';

export default async function createEffect(
	target: Container,
	indicator: Container<BinaryIndicatorPayload> | Container<IndicatorPayload>,
	iooiType?: IooiType
) {
	const newEffect = containerOfType(
		payloadTypes.enum.effect,
		target.organization,
		target.organizational_unit,
		target.managed_by,
		env.PUBLIC_KC_REALM
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
