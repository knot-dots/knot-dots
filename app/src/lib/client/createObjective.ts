import { _, unwrapFunctionStore } from 'svelte-i18n';
import { env } from '$env/dynamic/public';
import saveContainer from '$lib/client/saveContainer';
import {
	type BinaryIndicatorPayload,
	type Container,
	containerOfType,
	type IndicatorPayload,
	type InitialObjectivePayload,
	type IooiType,
	type NewContainer,
	payloadTypes,
	predicates
} from '$lib/models';

export default async function createObjective(
	target: Container,
	indicator: Container<BinaryIndicatorPayload> | Container<IndicatorPayload>,
	iooiType?: IooiType
) {
	const isOverallObjective = target.guid == indicator.guid;
	const newObjective = containerOfType(
		payloadTypes.enum.objective,
		target.organization,
		target.organizational_unit,
		target.managed_by,
		env.PUBLIC_KC_REALM
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
	});
	return await response.json();
}
