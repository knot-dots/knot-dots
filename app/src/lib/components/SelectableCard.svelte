<script lang="ts">
	import { _, date } from 'svelte-i18n';
	import Lightbulb from '~icons/flowbite/lightbulb-solid';
	import Cog from '~icons/knotdots/cog';
	import EffectChart from '$lib/components/EffectChart.svelte';
	import ObjectiveChart from '$lib/components/ObjectiveChart.svelte';
	import Progress from '$lib/components/Progress.svelte';
	import Summary from '$lib/components/Summary.svelte';
	import {
		isContainerWithProgress,
		isEffectContainer,
		isGoalContainer,
		isIndicatorTemplateContainer,
		isObjectiveContainer,
		isOrganizationalUnitContainer,
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
		checked?: boolean;
		container: AnyContainer;
		inputType?: 'checkbox' | 'radio';
		onchange: (event: Event & { currentTarget: HTMLInputElement }) => void;
		relatedContainers?: AnyContainer[];
	}

	let {
		checked = false,
		container,
		inputType = 'checkbox',
		onchange,
		relatedContainers = []
	}: Props = $props();

	let label: HTMLLabelElement;

	const id = crypto.randomUUID();

	function handleClick(event: MouseEvent) {
		if (label == event.target || label.control == event.target) {
			return;
		}
		const isTextSelected = window.getSelection()?.toString();
		if (!isTextSelected) {
			label.click();
		}
	}

	function handleKeyUp(event: KeyboardEvent) {
		if (event.key == 'Enter') {
			label.click();
		}
	}
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<article class="card" onclick={handleClick} onkeyup={handleKeyUp} tabindex="-1">
	<header>
		<h3>
			{#if inputType === 'checkbox'}
				<input {checked} {id} name="item" {onchange} type="checkbox" value={container.guid} />
			{:else}
				<input
					class="is-visually-hidden"
					{checked}
					{id}
					name="item"
					{onchange}
					type="radio"
					value={container.guid}
				/>
			{/if}

			<label bind:this={label} for={id}>
				{#if 'title' in container.payload}
					{container.payload.title}
				{:else if 'name' in container.payload}
					{container.payload.name}
				{/if}
			</label>
		</h3>
	</header>

	<div class="body">
		{#if isIndicatorTemplateContainer(container)}
			<Summary {container} />
			<p class="badges">
				{#each container.payload.indicatorCategory as indicatorCategory (indicatorCategory)}
					<span class="badge">{$_(indicatorCategory)}</span>
				{/each}
			</p>
		{:else if isEffectContainer(container)}
			{@const indicator = relatedContainers.find(isIndicatorTemplateContainer)}
			{#if indicator}
				<EffectChart {container} {relatedContainers} />
			{/if}
		{:else if isGoalContainer(container)}
			{@const effect = relatedContainers.filter(isEffectContainer).find(isPartOf(container))}
			{@const indicator = relatedContainers
				.filter(isIndicatorTemplateContainer)
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
			{@const indicator = relatedContainers.find(isIndicatorTemplateContainer)}
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
			<img
				alt={$_('cover_image')}
				class={{ ['coat-of-arms']: isOrganizationalUnitContainer(container) }}
				loading="lazy"
				src={transformFileURL(container.payload.image)}
			/>
		{:else if 'summary' in container.payload || ('description' in container.payload && !isTaskContainer(container))}
			<Summary {container} />
		{/if}
	</div>

	<footer>
		{#if 'ruleStatus' in container.payload}
			{@const ruleStatus = container.payload.ruleStatus}
			{@const RuleStatusIcon = ruleStatusIcons.get(ruleStatus) ?? Cog}
			<span class="badge badge--{ruleStatusColors.get(ruleStatus)}">
				<RuleStatusIcon />
				{$_(ruleStatus)}
			</span>
		{:else if 'status' in container.payload}
			{@const status = container.payload.status}
			{@const StatusIcon = statusIcons.get(status) ?? Lightbulb}
			<span class="badge badge--{statusColors.get(status)}">
				<StatusIcon />
				{$_(status)}
			</span>
		{:else if 'taskStatus' in container.payload}
			{@const taskStatus = container.payload.taskStatus}
			{@const TaskStatusIcon = taskStatusIcons.get(taskStatus) ?? Lightbulb}
			<span class="badge badge--{taskStatusColors.get(taskStatus)}">
				<TaskStatusIcon />
				{$_(taskStatus)}
			</span>
		{:else if isContainerWithProgress(container)}
			<Progress value={container.payload.progress} />
		{:else if 'programType' in container.payload}
			{@const programType = container.payload.programType}
			<span class="badge">{$_(programType)}</span>
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
		justify-content: flex-end;
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
		display: flex;
		font-size: 0.875rem;
		font-weight: 400;
		flex-direction: column;
		flex-grow: 1;
	}

	img {
		object-fit: contain;
	}

	.coat-of-arms {
		align-self: flex-end;
		margin: 0 auto;
		height: 7rem;
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
		flex-shrink: 1;
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
