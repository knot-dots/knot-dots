import { _, unwrapFunctionStore } from 'svelte-i18n';
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
	const isOverallObjective = target.guid == indicator.guid;
	const newObjective = containerOfType(
		payloadTypes.enum.objective,
		target.organization,
		target.organizational_unit,
		target.managed_by,
		env.PUBLIC_KC_REALM
	) as EmptyObjectiveContainer;

	const title = isOverallObjective
		? unwrapFunctionStore(_)('overall_objective_title', {
				values: { indicator: indicator.payload.title }
			})
		: indicator.payload.title;

	const payload = newObjective.payload as EmptyObjectiveContainer['payload'] & { title: string };
	payload.title = title ?? '';
	const response = await saveContainer({
		...newObjective,
		payload,
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
