import { env } from '$env/dynamic/public';
import saveContainer from '$lib/client/saveContainer';
import {
	type Container,
	containerOfType,
	type EmptyObjectiveContainer,
	type IndicatorContainer,
	payloadTypes,
	predicates
} from '$lib/models';

export default async function createObjective(target: Container, indicator: IndicatorContainer) {
	const newObjective = containerOfType(
		payloadTypes.enum.objective,
		target.organization,
		target.organizational_unit,
		env.PUBLIC_KC_REALM
	) as EmptyObjectiveContainer;
	const response = await saveContainer({
		...newObjective,
		payload: { ...newObjective.payload, title: indicator.payload.title },
		relation: [
			{
				object: indicator.revision,
				position: 0,
				predicate: predicates.enum['is-objective-for']
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
