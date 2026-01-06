<script lang="ts">
	import { _, date } from 'svelte-i18n';
	import Lightbulb from '~icons/flowbite/lightbulb-solid';
	import Cog from '~icons/knotdots/cog';
	import EffectChart from '$lib/components/EffectChart.svelte';
	import IndicatorChart from '$lib/components/IndicatorChart.svelte';
	import ObjectiveChart from '$lib/components/ObjectiveChart.svelte';
	import Progress from '$lib/components/Progress.svelte';
	import Summary from '$lib/components/Summary.svelte';
	import {
		isContainerWithEffect,
		isContainerWithObjective,
		isEffectContainer,
		isGoalContainer,
		isIndicatorContainer,
		isObjectiveContainer,
		isPartOf,
		isResourceContainer,
		isSimpleMeasureContainer,
		isTaskContainer,
		predicates
	} from '$lib/models';
	import type { AnyContainer } from '$lib/models';
	import {
		ruleStatusColors,
		ruleStatusIcons,
		statusColors,
		statusIcons,
		taskStatusColors,
		taskStatusIcons
	} from '$lib/theme/models';
	import transformFileURL from '$lib/transformFileURL';

	interface Props {
		container: AnyContainer;
		relatedContainers?: AnyContainer[];
		selectable?: boolean;
		value: string[];
	}

	let {
		container,
		relatedContainers = [],
		selectable = false,
		value = $bindable()
	}: Props = $props();

	// svelte-ignore non_reactive_update
	let checkbox: HTMLInputElement;

	function handleClick(event: MouseEvent) {
		if (checkbox == event.target) {
			return;
		}
		const isTextSelected = window.getSelection()?.toString();
		if (!isTextSelected) {
			checkbox.click();
		}
	}

	function handleKeyUp(event: KeyboardEvent) {
		if (event.key == 'Enter') {
			checkbox.click();
		}
	}
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<article class="card" onclick={handleClick} onkeyup={handleKeyUp} tabindex="-1">
	<header>
		<h3>
			{#if selectable}
				<input
					bind:checked={
						() => value.includes(container.guid),
						(v) =>
							(value = v ? [...value, container.guid] : value.filter((id) => id !== container.guid))
					}
					bind:this={checkbox}
					id={crypto.randomUUID()}
					name="item"
					type="checkbox"
					value={container.guid}
				/>
			{/if}
			<label for={checkbox?.id}>
				{#if 'title' in container.payload}
					{container.payload.title}
				{:else if 'name' in container.payload}
					{container.payload.name}
				{/if}
			</label>
		</h3>
	</header>

	<div class="body">
		{#if isIndicatorContainer(container)}
			<IndicatorChart
				{container}
				relatedContainers={[
					...relatedContainers.filter(({ relation }) =>
						relation.some(({ object }) => object === container.guid)
					),
					...relatedContainers.filter(isContainerWithEffect),
					...relatedContainers.filter(isContainerWithObjective)
				]}
				showEffects
				showObjectives
			/>
			<p class="badges">
				{#each container.payload.indicatorType as indicatorType}
					<span class="badge">{$_(indicatorType)}</span>
				{/each}

				{#each container.payload.indicatorCategory as indicatorCategory}
					<span class="badge">{$_(indicatorCategory)}</span>
				{/each}
			</p>
		{:else if isEffectContainer(container)}
			{@const indicator = relatedContainers.find(isIndicatorContainer)}
			{#if indicator}
				<EffectChart {container} {relatedContainers} />
			{/if}
		{:else if isGoalContainer(container)}
			{@const effect = relatedContainers.filter(isEffectContainer).find(isPartOf(container))}
			{@const indicator = relatedContainers
				.filter(isIndicatorContainer)
				.find(
					({ guid }) =>
						(effect?.relation.findIndex(
							({ object, predicate }) =>
								predicate === predicates.enum['is-measured-by'] && object === guid
						) ?? -1) > -1
				)}
			{#if indicator && effect}
				<EffectChart container={effect} {relatedContainers} />
			{:else}
				<Summary {container} />
			{/if}
		{:else if isObjectiveContainer(container)}
			{@const indicator = relatedContainers.find(isIndicatorContainer)}
			{#if indicator}
				<ObjectiveChart {container} {relatedContainers} />
			{/if}
		{:else if isSimpleMeasureContainer(container)}
			<Progress value={container.payload.progress} />
		{:else if isResourceContainer(container)}
			<Summary {container} />
			<p>
				{container.payload.amount}
				{container.payload.unit},
				{container.payload.fulfillmentDate
					? $date(new Date(container.payload.fulfillmentDate), { format: 'medium' })
					: ''}
			</p>
		{:else if 'image' in container.payload && container.payload.image}
			<img alt={$_('cover_image')} src={transformFileURL(container.payload.image)} />
		{:else if 'summary' in container.payload || ('description' in container.payload && !isTaskContainer(container))}
			<Summary {container} />
		{/if}
	</div>

	<footer>
		{#if 'ruleStatus' in container.payload}
			{@const RuleStatusIcon = ruleStatusIcons.get(container.payload.ruleStatus) ?? Cog}
			<span class="badge badge--{ruleStatusColors.get(container.payload.ruleStatus)}">
				<RuleStatusIcon />
				{$_(container.payload.ruleStatus)}
			</span>
		{:else if 'status' in container.payload}
			{@const StatusIcon = statusIcons.get(container.payload.status) ?? Lightbulb}
			<span class="badge badge--{statusColors.get(container.payload.status)}">
				<StatusIcon />
				{$_(container.payload.status)}
			</span>
		{:else if 'taskStatus' in container.payload}
			{@const TaskStatusIcon = taskStatusIcons.get(container.payload.taskStatus) ?? Lightbulb}
			<span class="badge badge--{taskStatusColors.get(container.payload.taskStatus)}">
				<TaskStatusIcon />
				{$_(container.payload.taskStatus)}
			</span>
		{:else if 'progress' in container.payload}
			<Progress value={container.payload.progress} />
		{:else if 'programType' in container.payload}
			<span class="badge">{$_(container.payload.programType)}</span>
		{:else if 'indicatorType' in container.payload}
			<span></span>
		{/if}
	</footer>
</article>

<style>
	.card {
		background: #ffffff;
		border: 1px solid var(--color-gray-200);
		border-radius: 8px;
		box-shadow: var(--shadow-sm);
		display: flex;
		flex-direction: column;
		gap: 1rem;
		height: var(--height, auto);
		hyphens: auto;
		padding: 1rem;
		width: 100%;
		word-break: break-word;
	}

	.card:hover {
		background-color: var(--color-gray-100);
	}

	.card:has(input:checked) {
		background-color: var(--color-primary-050);
		border-color: var(--color-primary-700);
	}

	.card:has(input:checked):hover {
		border-color: var(--hover-border-color, var(--color-hover-neutral));
	}

	:global(#dnd-action-dragged-el .card) {
		cursor: inherit;
	}

	header {
		align-items: flex-start;
		display: flex;
	}

	header h3 {
		align-items: center;
		color: var(--color-gray-900);
		display: flex;
		gap: 0.75rem;
		font-size: 1rem;
		font-weight: 600;
		margin-bottom: 0;
	}

	header :global(svg) {
		height: 1.5rem;
		width: 1.5rem;
	}

	.body {
		color: var(--color-gray-500);
		font-size: 0.875rem;
		font-weight: 400;
	}

	.badges {
		display: flex;
		flex-direction: row;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	footer {
		align-items: flex-end;
		display: flex;
		flex-direction: row;
		gap: 12px;
		justify-content: space-between;
		margin-top: auto;
	}

	footer :global(.progress) {
		flex-grow: 1;
	}

	footer :global(button) {
		flex-shrink: 0;
		margin-left: auto;
	}

	@container style(--card-style: carousel) {
		.card {
			display: grid;
			grid-row: inherit;
			grid-template-rows: inherit;
		}

		header {
			grid-row: 1 / 2;
		}

		.body {
			grid-row: 2 / 3;
		}

		footer {
			grid-row: 3 / 4;
		}
	}
</style>
