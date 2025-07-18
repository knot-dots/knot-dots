<script lang="ts">
	import { getContext, type Snippet } from 'svelte';
	import { _, date } from 'svelte-i18n';
	import Cog8Tooth from '~icons/heroicons/cog-8-tooth-16-solid';
	import LightBulb from '~icons/heroicons/light-bulb-16-solid';
	import Relation from '~icons/knotdots/relation';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import EffectChart from '$lib/components/EffectChart.svelte';
	import IndicatorChart from '$lib/components/IndicatorChart.svelte';
	import ObjectiveChart from '$lib/components/ObjectiveChart.svelte';
	import Progress from '$lib/components/Progress.svelte';
	import Summary from '$lib/components/Summary.svelte';
	import {
		findAncestors,
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
		overlayKey,
		overlayURL,
		paramsFromFragment,
		predicates
	} from '$lib/models';
	import type { AnyContainer, Container } from '$lib/models';
	import { overlay, overlayHistory } from '$lib/stores';
	import {
		predicateIcons,
		ruleStatusColors,
		ruleStatusIcons,
		statusColors,
		statusIcons,
		taskStatusColors,
		taskStatusIcons
	} from '$lib/theme/models';

	interface Props {
		body?: Snippet;
		button?: Snippet;
		container: AnyContainer;
		footer?: Snippet;
		href?: () => string;
		relatedContainers?: Container[];
		showRelationFilter?: boolean;
		titleOverride?: boolean;
	}

	let {
		body,
		button,
		container,
		footer,
		href,
		relatedContainers = [],
		showRelationFilter = false,
		titleOverride = false
	}: Props = $props();

	let overlayContext = getContext('overlay');

	let relatedTo = $derived(
		overlayContext
			? paramsFromFragment(page.url).get('related-to')
			: page.url.searchParams.get('related-to')
	);

	let selected = $derived.by(() => {
		if ($overlay?.key === overlayKey.enum.relations) {
			return $overlay.container;
		} else if (!overlayContext && relatedTo && page.data.containers) {
			return page.data.containers.find(({ guid }: Container) => guid == relatedTo);
		} else if (!overlayContext && page.data.container) {
			return page.data.container;
		} else {
			return undefined;
		}
	});

	function applyRelationFilter(url: URL) {
		return async (event: Event) => {
			event.stopPropagation();

			if (overlayContext) {
				const params = paramsFromFragment(url);
				if (relatedTo === container.guid) {
					params.delete('related-to');
				} else {
					params.set('related-to', container.guid);
				}
				await goto(`#${params.toString()}`);
			} else {
				const params = new URLSearchParams(url.searchParams);
				if (relatedTo === container.guid) {
					params.delete('related-to');
				} else {
					params.set('related-to', container.guid);
				}
				await goto(`?${params.toString()}${url.hash}`);
			}
		};
	}

	function computeHref(url: URL) {
		const hashParams = paramsFromFragment(url);
		if (hashParams.get(overlayKey.enum.view) === container.guid) {
			return '#';
		} else if (hashParams.has('indicators')) {
			return overlayURL(url, 'view', container.guid, [
				['program', hashParams.get('indicators') as string]
			]);
		} else {
			return overlayURL(url, 'view', container.guid);
		}
	}

	let previewLink: HTMLAnchorElement;

	function handleClick(event: MouseEvent) {
		if (previewLink == event.target) {
			return;
		}
		const isTextSelected = window.getSelection()?.toString();
		if (!isTextSelected) {
			previewLink.click();
		}
	}

	function handleKeyUp(event: KeyboardEvent) {
		if (event.key == 'Enter') {
			previewLink.click();
		}
	}

	function updateOverlayHistory(event: MouseEvent) {
		const anchorHashParams = new URLSearchParams(
			(event.currentTarget as HTMLAnchorElement).hash.substring(1)
		);
		if (!overlayContext && !$overlayHistory[$overlayHistory.length - 1]?.has('relate')) {
			$overlayHistory = [anchorHashParams];
		}
	}

	const highlightColorMap = new Map<string, string>([
		[predicates.enum['contributes-to'], 'var(--color-contributes-to)'],
		[predicates.enum['is-affected-by'], 'var(--color-is-affected-by)'],
		[predicates.enum['is-concrete-target-of'], 'var(--color-is-concrete-target-of)'],
		[predicates.enum['is-consistent-with'], 'var(--color-is-consistent-with)'],
		[predicates.enum['is-duplicate-of'], 'var(--color-is-duplicate-of)'],
		[predicates.enum['is-equivalent-to'], 'var(--color-is-equivalent-to)'],
		[predicates.enum['is-inconsistent-with'], 'var(--color-is-inconsistent-with)'],
		[predicates.enum['is-prerequisite-for'], 'var(--color-is-prerequisite-for)'],
		[predicates.enum['is-sub-target-of'], 'var(--color-is-sub-target-of)'],
		[predicates.enum['is-superordinate-of'], 'var(--color-is-superordinate-of)']
	]);

	function highlightColor(a: AnyContainer, b: Container) {
		return a.relation
			.filter((r) => a.guid != b.guid && (r.object === b.guid || r.subject === b.guid))
			.map(({ predicate }) => highlightColorMap.get(predicate))
			.pop();
	}

	function relationIcon(a: AnyContainer, b: Container) {
		return a.relation
			.filter((r) => a.guid != b.guid && (r.object === b.guid || r.subject === b.guid))
			.map(({ predicate }) => predicateIcons.get(predicate))
			.pop();
	}
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<article
	tabindex="-1"
	title={'title' in container.payload
		? container.payload.title
		: 'name' in container.payload
			? container.payload.name
			: undefined}
	data-sveltekit-keepfocus
	class="card"
	class:is-active={paramsFromFragment(page.url).get(overlayKey.enum.view) === container.guid ||
		paramsFromFragment(page.url).get(overlayKey.enum.relate) === container.guid}
	class:is-highlighted={selected && highlightColor(container, selected)}
	style:--highlight-color={selected && highlightColor(container, selected)}
	onclick={handleClick}
	onkeyup={handleKeyUp}
>
	<header>
		<h3>
			<a
				href={href ? href() : computeHref(page.url)}
				bind:this={previewLink}
				onclick={updateOverlayHistory}
			>
				{#if titleOverride && isObjectiveContainer(container)}
					{@const goal = relatedContainers
						.filter(isContainerWithObjective)
						.find(
							(candidate) =>
								container.relation.findIndex(
									({ object, predicate, subject }) =>
										container.guid === subject &&
										candidate.guid === object &&
										predicate === predicates.enum['is-part-of']
								) > -1
						)}
					{#if goal}
						{goal.payload.title} ({container.payload.title})
					{/if}
				{:else if titleOverride && isEffectContainer(container)}
					{@const measure = findAncestors(
						container,
						relatedContainers,
						predicates.enum['is-part-of']
					).find(isContainerWithEffect)}
					{#if measure}
						{measure.payload.title} ({container.payload.title})
					{/if}
				{:else if 'title' in container.payload}
					{container.payload.title}
				{:else if 'name' in container.payload}
					{container.payload.name}
				{/if}
			</a>
		</h3>
		{#if selected && relationIcon(container, selected)}
			{@const RelationIcon = relationIcon(container, selected)}
			<span>
				<RelationIcon />
			</span>
		{/if}
	</header>

	<div class="body">
		{#if body}
			{@render body()}
		{:else if isIndicatorContainer(container)}
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
			<Progress value={container.payload.progress} compact />
		{:else if isResourceContainer(container)}
			<Summary {container} />
			<p>
				{container.payload.amount}
				{container.payload.unit},
				{container.payload.fulfillmentDate
					? $date(new Date(container.payload.fulfillmentDate), { format: 'medium' })
					: ''}
			</p>
		{:else if 'image' in container.payload}
			<img alt={$_('cover_image')} src={container.payload.image} />
		{:else if 'summary' in container.payload || ('description' in container.payload && !isTaskContainer(container))}
			<Summary {container} />
		{/if}
	</div>

	<footer>
		{#if footer}
			{@render footer()}
		{:else if 'ruleStatus' in container.payload}
			{@const RuleStatusIcon = ruleStatusIcons.get(container.payload.ruleStatus) ?? Cog8Tooth}
			<span class="badge badge--{ruleStatusColors.get(container.payload.ruleStatus)}">
				<RuleStatusIcon />
				{$_(container.payload.ruleStatus)}
			</span>
		{:else if 'status' in container.payload}
			{@const StatusIcon = statusIcons.get(container.payload.status) ?? LightBulb}
			<span class="badge badge--{statusColors.get(container.payload.status)}">
				<StatusIcon />
				{$_(container.payload.status)}
			</span>
		{:else if 'taskStatus' in container.payload}
			{@const TaskStatusIcon = taskStatusIcons.get(container.payload.taskStatus) ?? LightBulb}
			<span class="badge badge--{taskStatusColors.get(container.payload.taskStatus)}">
				<TaskStatusIcon />
				{$_(container.payload.taskStatus)}
			</span>
		{:else if 'progress' in container.payload}
			<Progress value={container.payload.progress} compact />
		{:else if 'programType' in container.payload}
			<span class="badge">{$_(container.payload.programType)}</span>
		{:else if 'indicatorType' in container.payload}
			<span></span>
		{/if}

		{#if button}
			{@render button()}
		{:else if showRelationFilter}
			<button
				class="button-relation button-relation--square"
				aria-label={$_('show_relations')}
				class:is-active={relatedTo === container.guid}
				onclick={applyRelationFilter(page.url)}
			>
				<Relation />
			</button>
		{/if}
	</footer>
</article>

<style>
	.card {
		background: #ffffff;
		border: 1px solid var(--color-gray-200);
		border-radius: 8px;
		box-shadow: var(--shadow-sm);
		cursor: pointer;
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

	.card.is-active {
		background-color: var(--color-primary-050);
		border-color: var(--color-primary-700);
	}

	.card.is-highlighted {
		border-color: var(--highlight-color, var(--color-gray-200));
		border-width: 3px;
		padding: calc(1rem - 2px);
	}

	.card.is-highlighted:hover {
		border-color: var(--hover-border-color, var(--color-hover-neutral));
	}

	:global(#dnd-action-dragged-el .card) {
		cursor: inherit;
	}

	:global(#dnd-action-dragged-el .card:hover) {
		background: #ffffff;
	}

	header {
		align-items: flex-start;
		display: flex;
	}

	header h3 {
		color: var(--color-gray-900);
		font-size: 1rem;
		font-weight: 600;
		margin-bottom: 0;
	}

	header span {
		flex-shrink: 0;
		margin-left: auto;
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
