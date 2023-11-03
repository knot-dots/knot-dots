<script lang="ts">
	import { _ } from 'svelte-i18n';
	import paramsFromURL from '$lib/client/paramsFromURL';
	import ContainerForm from '$lib/components/ContainerForm.svelte';
	import Editor from '$lib/components/Editor.svelte';
	import ListBox from '$lib/components/ListBox.svelte';
	import RelationSelector from '$lib/components/RelationSelector.svelte';
	import ResourcePlanner from '$lib/components/ResourcePlanner.svelte';
	import { predicates, status, sustainableDevelopmentGoals, topics } from '$lib/models';
	import type {
		AnyContainer,
		EmptyMeasureContainer,
		MeasureContainer,
		OperationalGoalContainer
	} from '$lib/models';
	import { page } from '$app/stores';

	export let container: MeasureContainer | EmptyMeasureContainer;
	export let isPartOfOptions: AnyContainer[];

	let statusParam = paramsFromURL($page.url).get('status') ?? status.enum['status.idea'];

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

<ContainerForm {container} on:submitSuccessful on:deleteSuccessful>
	<svelte:fragment slot="data">
		<label>
			{$_('measure.summary')}
			<textarea name="summary" maxlength="200" bind:value={container.payload.summary} required />
		</label>
		<Editor label={$_('description')} bind:value={container.payload.description} />
		<ResourcePlanner {container} />
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
		{#if container.payload.status === status.enum['status.in_planning']}
			<Editor label={$_('annotation')} bind:value={container.payload.annotation} />
		{:else if container.payload.status === status.enum['status.in_implementation']}
			<Editor label={$_('comment')} bind:value={container.payload.comment} />
		{:else if container.payload.status === status.enum['status.in_operation']}
			<Editor label={$_('result')} bind:value={container.payload.result} />
		{/if}
	</svelte:fragment>

	<svelte:fragment slot="meta">
		<ListBox
			label={$_('topic.label')}
			options={topics.options}
			bind:value={container.payload.topic}
		/>
		<ListBox
			label={$_('category')}
			options={sustainableDevelopmentGoals.options}
			bind:value={container.payload.category}
		/>
		<label>
			{$_('status.label')}
			<select name="status" bind:value={container.payload.status} required>
				{#each status.options as statusOption}
					<option value={statusOption} selected={statusOption === statusParam}>
						{$_(statusOption)}
					</option>
				{/each}
			</select>
		</label>
		<fieldset class="duration">
			<legend>{$_('planned_duration')}</legend>
			<label>
				{$_('start_date')}
				<input type="date" name="startDate" bind:value={container.payload.startDate} />
			</label>
			<label>
				{$_('end_date')}
				<input type="date" name="endDate" bind:value={container.payload.endDate} />
			</label>
		</fieldset>
		<RelationSelector {container} {isPartOfOptions} />
		<ListBox
			label={$_('boards')}
			options={['board.internal_objectives', 'board.tasks']}
			bind:value={container.payload.boards}
		/>
	</svelte:fragment>
</ContainerForm>

<style>
	.duration {
		display: flex;
		gap: 1rem;
	}
</style>
