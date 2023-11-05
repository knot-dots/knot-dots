<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { predicates, status } from '$lib/models';
	import type {
		AnyContainer,
		EmptyMeasureContainer,
		MeasureContainer,
		OperationalGoalContainer
	} from '$lib/models';

	export let container: MeasureContainer | EmptyMeasureContainer;
	export let isPartOfOptions: AnyContainer[];

	let relatedContainers: OperationalGoalContainer[];

	$: {
		relatedContainers = isPartOfOptions.filter(
			(o) =>
				container.relation.findIndex(
					(r) => r.predicate === predicates.enum['is-part-of'] && r.object === o.revision
				) > -1
		) as OperationalGoalContainer[];

		if (
			!container.payload.indicatorContribution ||
			Object.keys(container.payload.indicatorContribution).length == 0
		) {
			const indicatorContribution: Record<string, number> = {};
			relatedContainers.forEach((o) => {
				if (
					'indicator' in o.payload &&
					o.payload.indicator.length > 0 &&
					'quantity' in o.payload.indicator[0]
				) {
					indicatorContribution[o.guid] = 0;
				}
			});
			container.payload.indicatorContribution = indicatorContribution;
			container.payload.indicatorContributionAchieved = { ...indicatorContribution };
		}
	}
</script>

{#each relatedContainers as o}
	{#if container.payload.indicatorContribution?.[o.guid] !== undefined}
		<label>
			{$_(`${o.payload.indicator[0].quantity}.input_prompt`)}
			<input
				type="text"
				inputmode="numeric"
				name="indicatorContribution-{o.guid}"
				bind:value={container.payload.indicatorContribution[o.guid]}
			/>
		</label>
	{/if}
	{#if container.payload.indicatorContributionAchieved?.[o.guid] !== undefined && [status.enum['status.in_implementation'], status.enum['status.in_operation']].some((s) => s === container.payload.status)}
		<label>
			{$_('quantity.general.input_prompt_achieved')}
			<input
				type="text"
				inputmode="numeric"
				name="indicatorContributionAchieved-{o.guid}"
				bind:value={container.payload.indicatorContributionAchieved[o.guid]}
			/>
		</label>
	{/if}
{/each}
