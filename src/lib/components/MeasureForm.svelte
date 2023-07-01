<script lang="ts">
	import { _ } from 'svelte-i18n';
	import ContainerForm from '$lib/components/ContainerForm.svelte';
	import RelationSelector from '$lib/components/RelationSelector.svelte';
	import { predicates, status, sustainableDevelopmentGoals } from '$lib/models';
	import type {
		Container,
		EmptyMeasureContainer,
		MeasureContainer,
		OperationalGoalContainer
	} from '$lib/models';

	export let container: MeasureContainer | EmptyMeasureContainer;
	export let isPartOfOptions: Container[];

	let relatedContainers: OperationalGoalContainer[] = [];

	$: {
		relatedContainers = isPartOfOptions.filter(
			(o) =>
				container.relation.findIndex(
					(r) => r.predicate === predicates.enum['is-part-of'] && r.object === o.revision
				) > -1
		) as OperationalGoalContainer[];

		if (!('indicatorContribution' in container.payload)) {
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
		}
	}
</script>

<ContainerForm {container} on:submitSuccessful>
	<svelte:fragment slot="extra-data">
		{#each relatedContainers as o}
			{#if container.payload.indicatorContribution?.[o.guid]}
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
		{/each}
	</svelte:fragment>

	<svelte:fragment slot="meta">
		<label>
			{$_('status.label')}
			<select name="status" bind:value={container.payload.status} required>
				{#each status.options as statusOption}
					<option value={statusOption}>
						{$_(statusOption)}
					</option>
				{/each}
			</select>
		</label>
		<label>
			{$_('category')}
			<select name="category" bind:value={container.payload.category} required>
				<option label="" />
				{#each sustainableDevelopmentGoals.options as goal}
					<option value={goal}>
						{$_(goal)}
					</option>
				{/each}
			</select>
		</label>
		<RelationSelector
			{isPartOfOptions}
			payloadType={container.payload.type}
			selected={container.relation}
		/>
	</svelte:fragment>

	<slot slot="extra-buttons">
		<slot name="extra-buttons" />
	</slot>
</ContainerForm>
