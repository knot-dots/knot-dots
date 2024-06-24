import { env } from '$env/dynamic/public';
import {
	type Container,
	containerOfType,
	type EmptyEffectContainer,
	type IndicatorContainer,
	payloadTypes,
	predicates
} from '$lib/models';
import saveContainer from '$lib/client/saveContainer';

export default async function createEffect(target: Container, indicator: IndicatorContainer) {
	const newEffect = containerOfType(
		payloadTypes.enum.effect,
		target.organization,
		target.organizational_unit,
		env.PUBLIC_KC_REALM
	) as EmptyEffectContainer;
	const response = await saveContainer({
		...newEffect,
		payload: { ...newEffect.payload, title: indicator.payload.title },
		relation: [
			{
				object: indicator.revision,
				position: 0,
				predicate: predicates.enum['is-measured-by']
			},
			{
				object: target.revision,
				position: 0,
				predicate: predicates.enum['is-part-of']
			}
		]
	});
	return await response.json();
}
