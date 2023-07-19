<script lang="ts">
	import { Editor } from 'bytemd';
	import 'bytemd/dist/index.css';
	import { _ } from 'svelte-i18n';
	import ContainerForm from '$lib/components/ContainerForm.svelte';
	import RelationSelector from '$lib/components/RelationSelector.svelte';
	import ResourcePlanner from '$lib/components/ResourcePlanner.svelte';
	import { predicates, status, sustainableDevelopmentGoals, topics } from '$lib/models';
	import type {
		Container,
		EmptyMeasureContainer,
		MeasureContainer,
		OperationalGoalContainer
	} from '$lib/models';

	export let container: MeasureContainer | EmptyMeasureContainer;
	export let isPartOfOptions: Container[];

	let relatedContainers: OperationalGoalContainer[];

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
	<svelte:fragment slot="data">
		<label>
			{$_('measure.summary')}
			<textarea name="summary" maxlength="200" bind:value={container.payload.summary} required />
		</label>
		<label>
			{$_('measure.description')}
			<Editor
				value={container.payload.description ?? ''}
				on:change={(e) => (container.payload.description = e.detail.value)}
			/>
		</label>
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
			{#if container.payload.status == status.enum['status.in_planning']}
				<label>
					{$_('annotation')}
					<Editor
						value={container.payload.annotation ?? ''}
						on:change={(e) => (container.payload.annotation = e.detail.value)}
					/>
				</label>
			{:else if container.payload.status == status.enum['status.in_implementation']}
				<label>
					{$_('comment')}
					<Editor
						value={container.payload.comment ?? ''}
						on:change={(e) => (container.payload.comment = e.detail.value)}
					/>
				</label>
			{:else if container.payload.status == status.enum['status.in_operation']}
				<label>
					{$_('result')}
					<Editor
						value={container.payload.result ?? ''}
						on:change={(e) => (container.payload.result = e.detail.value)}
					/>
				</label>
			{/if}
		{/each}
	</svelte:fragment>

	<svelte:fragment slot="meta">
		<label>
			{$_('topic.label')}
			<select name="topic" bind:value={container.payload.topic} multiple>
				{#each topics.options as topicOption}
					<option value={topicOption}>
						{$_(topicOption)}
					</option>
				{/each}
			</select>
		</label>
		<label>
			{$_('category')}
			<select name="category" bind:value={container.payload.category} multiple>
				{#each sustainableDevelopmentGoals.options as goal}
					<option value={goal}>
						{$_(goal)}
					</option>
				{/each}
			</select>
		</label>
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
		<fieldset class="duration">
			<legend>{$_('planned_duration')}</legend>
			<label>
				{$_('start_date')}
				<input type="date" name="startDate" bind:value={container.payload.startDate} required />
			</label>
			<label>
				{$_('end_date')}
				<input type="date" name="endDate" bind:value={container.payload.endDate} />
			</label>
		</fieldset>
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

<style>
	.duration {
		display: flex;
		gap: 1rem;
	}
</style>
