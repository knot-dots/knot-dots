<script lang="ts">
	import { getContext, type Snippet } from 'svelte';
	import { _, date } from 'svelte-i18n';
	import Lightbulb from '~icons/flowbite/lightbulb-solid';
	import Cog from '~icons/knotdots/cog';
	import Relation from '~icons/knotdots/relation';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import BooleanValueToggle from '$lib/components/BooleanValueToggle.svelte';
	import EffectChart from '$lib/components/EffectChart.svelte';
	import ObjectiveChart from '$lib/components/ObjectiveChart.svelte';
	import Progress from '$lib/components/Progress.svelte';
	import Summary from '$lib/components/Summary.svelte';
	import Tendency from '$lib/components/Tendency.svelte';
	import {
		type AnyContainer,
		type Container,
		findAncestors,
		isActualDataContainer,
		isBinaryIndicatorContainer,
		isContainerWithEffect,
		isContainerWithObjective,
		isContainerWithProgress,
		isContentPartnerContainer,
		isEffectContainer,
		isGoalContainer,
		isIndicatorTemplateContainer,
		isObjectiveContainer,
		isPartOf,
		isQuoteContainer,
		isResourceContainer,
		isSimpleMeasureContainer,
		isTaskContainer,
		isTeaserContainer,
		overlayKey,
		overlayURL,
		paramsFromFragment,
		predicates
	} from '$lib/models';
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
	import transformFileURL from '$lib/transformFileURL';
	import tooltip from '$lib/attachments/tooltip';

	interface Props {
		body?: Snippet;
		button?: Snippet;
		container: AnyContainer;
		footer?: Snippet;
		href?: () => string;
		relatedContainers?: AnyContainer[];
		showRelationFilter?: boolean;
		titleOverride?: boolean;
		maxSummaryLength?: number;
	}

	let {
		body,
		button,
		container,
		footer,
		href,
		relatedContainers = [],
		showRelationFilter = false,
		titleOverride = false,
		maxSummaryLength
	}: Props = $props();

	let overlayContext = getContext('overlay');

	let title = $derived(
		'title' in container.payload
			? container.payload.title.replace(
					/@current_organizational_unit_name/g,
					page.data.currentOrganizationalUnit?.payload.name ?? ''
				)
			: 'name' in container.payload
				? container.payload.name
				: undefined
	);

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
		}

		// Check for overlay indicators/resources
		if (
			hashParams.has('indicators') ||
			page.route.id === '/[guid=uuid]/[contentGuid=uuid]/indicators/catalog'
		) {
			return overlayURL(url, 'view', container.guid, [
				['program', hashParams.get('indicators') ?? (page.params.contentGuid as string)]
			]);
		} else if (
			hashParams.has('resources') ||
			page.route.id === '/[guid=uuid]/[contentGuid=uuid]/resources/catalog'
		) {
			return overlayURL(url, 'view', container.guid, [
				['program', hashParams.get('resources') ?? (page.params.contentGuid as string)]
			]);
		}

		return overlayURL(url, 'view', container.guid);
	}

	let previewLink: HTMLAnchorElement;

	function handleClick(event: MouseEvent) {
		if (!previewLink || previewLink.contains(event.target as Node)) {
			return;
		}
		const isTextSelected = window.getSelection()?.toString();
		if (!isTextSelected) {
			previewLink.click();
		}
	}

	function handleKeyUp(event: KeyboardEvent) {
		if (event.key == 'Enter') {
			previewLink?.click();
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
		[predicates.enum['implies'], 'var(--color-implies)'],
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
	{title}
	data-sveltekit-keepfocus
	class="card"
	class:is-active={paramsFromFragment(page.url).get(overlayKey.enum.view) === container.guid ||
		paramsFromFragment(page.url).get(overlayKey.enum.relate) === container.guid}
	class:is-highlighted={selected && highlightColor(container, selected)}
	style:--highlight-color={selected && highlightColor(container, selected)}
	onclick={handleClick}
	onkeyup={handleKeyUp}
>
	{#if !isTeaserContainer(container) && !isContentPartnerContainer(container)}
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
							{title} ({container.payload.title})
						{/if}
					{:else if titleOverride && isEffectContainer(container)}
						{@const measure = findAncestors(container, relatedContainers, [
							predicates.enum['is-part-of']
						]).find(isContainerWithEffect)}
						{#if measure}
							{title} ({container.payload.title})
						{/if}
					{:else}
						{title}
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
	{/if}
	<div class="body">
		{#if body}
			{@render body()}
		{:else if isBinaryIndicatorContainer(container)}
			{@const actualDataContainer = relatedContainers.find(isActualDataContainer)}
			<Summary {container} />
			{#if actualDataContainer}
				<BooleanValueToggle checked={actualDataContainer.payload.booleanValue} disabled />
			{/if}
		{:else if isEffectContainer(container)}
			{#if relatedContainers.find(isIndicatorTemplateContainer) && container.payload.plannedValues.length > 0}
				<EffectChart {container} {relatedContainers} />
			{:else if container.payload.booleanValue !== undefined}
				<Summary {container} />
				<BooleanValueToggle checked={container.payload.booleanValue} disabled />
			{:else}
				<Tendency {container} />
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
				<Summary {container} maxLength={maxSummaryLength} />
			{/if}
		{:else if isObjectiveContainer(container)}
			{#if container.payload.wantedValues.length > 0 && relatedContainers.find(isIndicatorTemplateContainer)}
				<ObjectiveChart {container} {relatedContainers} />
			{:else if container.payload.booleanValue !== undefined}
				<Summary {container} />
				<BooleanValueToggle checked={container.payload.booleanValue} disabled />
			{:else}
				<Tendency {container} />
			{/if}
		{:else if isContentPartnerContainer(container)}
			<a href={computeHref(page.url)} bind:this={previewLink} onclick={updateOverlayHistory}>
				{#if 'image' in container.payload && container.payload.image}
					<img alt={$_('cover_image')} src={transformFileURL(container.payload.image)} />
				{:else}
					<header>
						<h3>
							{container.payload.title}
						</h3>
					</header>
				{/if}
			</a>
		{:else if isTeaserContainer(container)}
			{#if 'image' in container.payload && container.payload.image}
				<p>
					<img alt={$_('cover_image')} src={transformFileURL(container.payload.image)} />
				</p>
			{/if}
			{#if !isQuoteContainer(container)}
				<header>
					<h3>
						<a
							href={href ? href() : computeHref(page.url)}
							bind:this={previewLink}
							onclick={updateOverlayHistory}>{container.payload.title}</a
						>
					</h3>
				</header>
			{/if}
			<Summary {container} maxLength={maxSummaryLength} />
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
		{#if footer}
			{@render footer()}
		{:else if 'ruleStatus' in container.payload}
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
		{:else if isContainerWithProgress(container) && container.payload.progress != null}
			<Progress value={container.payload.progress} />
		{:else if 'programType' in container.payload}
			{@const programType = container.payload.programType}
			<span class="badge">{$_(programType)}</span>
		{:else if 'indicatorType' in container.payload}
			<span></span>
		{/if}

		{#if button}
			{@render button()}
		{:else if showRelationFilter}
			<button
				class="button-relation button-relation--square"
				class:is-active={relatedTo === container.guid}
				onclick={applyRelationFilter(page.url)}
				{@attach tooltip($_('show_relations'))}
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
		justify-content: flex-end;
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
		display: flex;
		flex-direction: column;
		flex-grow: 1;
		font-size: 0.875rem;
		font-weight: 400;
	}

	img {
		object-fit: contain;
	}

	footer {
		align-items: flex-end;
		display: flex;
		flex-direction: row;
		flex-shrink: 1;
		gap: 12px;
		justify-content: space-between;
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
			justify-content: initial;
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
