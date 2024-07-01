<script lang="ts">
	import { getContext } from 'svelte';
	import { _ } from 'svelte-i18n';
	import LightBulb from '~icons/heroicons/light-bulb-16-solid';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import fetchContainersWithParentObjectives from '$lib/client/fetchContainersWithParentObjectives';
	import fetchRelatedContainers from '$lib/client/fetchRelatedContainers';
	import IndicatorChart from '$lib/components/IndicatorChart.svelte';
	import Progress from '$lib/components/Progress.svelte';
	import ProgressBar from '$lib/components/ProgressBar.svelte';
	import Summary from '$lib/components/Summary.svelte';
	import {
		isEffectContainer,
		isIndicatorContainer,
		isSimpleMeasureContainer,
		overlayKey,
		overlayURL,
		paramsFromFragment,
		predicates
	} from '$lib/models';
	import type { AnyContainer, Container, ContainerWithObjective } from '$lib/models';
	import { overlay, overlayHistory } from '$lib/stores';
	import {
		predicateIcons,
		statusColors,
		statusIcons,
		taskStatusColors,
		taskStatusIcons
	} from '$lib/theme/models';

	export let container: AnyContainer;
	export let relatedContainers: Container[] = [];
	export let showRelationFilter = false;

	let selected: Container | undefined;

	let overlayContext = getContext('overlay');

	$: relatedTo = overlayContext
		? paramsFromFragment($page.url).get('related-to')
		: $page.url.searchParams.get('related-to');

	$: if ($overlay.object) {
		selected = $overlay.object;
	} else if (relatedTo && $page.data.containers) {
		selected = $page.data.containers.find(({ guid }: Container) => guid == relatedTo);
	} else if ($page.data.container) {
		selected = $page.data.container;
	} else {
		selected = undefined;
	}

	let containersWithObjectivesPromise: Promise<ContainerWithObjective[]>;
	let relatedContainersPromise: Promise<Container[]>;

	$: if (isIndicatorContainer(container)) {
		containersWithObjectivesPromise = fetchContainersWithParentObjectives(container);
		if (relatedContainers.length == 0) {
			relatedContainersPromise = fetchRelatedContainers(container.guid, {});
		} else {
			relatedContainersPromise = new Promise((resolve) => resolve(relatedContainers));
		}
	} else if (isEffectContainer(container)) {
		if (relatedContainers.length == 0) {
			relatedContainersPromise = fetchRelatedContainers(container.guid, {});
		} else {
			relatedContainersPromise = new Promise((resolve) => resolve(relatedContainers));
		}
	}

	async function applyRelationFilter(url: URL) {
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
	}

	let containerPreviewURL: string;

	$: {
		const hashParams = paramsFromFragment($page.url);
		if (hashParams.get(overlayKey.enum.view) === container.guid) {
			containerPreviewURL = '#';
		} else {
			containerPreviewURL = overlayURL($page.url, 'view', container.guid);
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
		[predicates.enum['is-consistent-with'], 'var(--color-is-consistent-with)'],
		[predicates.enum['is-equivalent-to'], 'var(--color-is-equivalent-to)'],
		[predicates.enum['is-inconsistent-with'], 'var(--color-is-inconsistent-with)'],
		[predicates.enum['is-duplicate-of'], 'var(--color-is-duplicate-of)']
	]);

	function highlightColor(a: AnyContainer, b: Container) {
		return a.relation
			.filter(
				(r) => a.revision != b.revision && (r.object === b.revision || r.subject === b.revision)
			)
			.map(({ predicate }) => highlightColorMap.get(predicate))
			.pop();
	}

	function relationIcon(a: AnyContainer, b: Container) {
		return a.relation
			.filter(
				(r) => a.revision != b.revision && (r.object === b.revision || r.subject === b.revision)
			)
			.map(({ predicate }) => predicateIcons.get(predicate))
			.pop();
	}
</script>

<!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
<article
	tabindex="-1"
	title={'title' in container.payload
		? container.payload.title
		: 'name' in container.payload
			? container.payload.name
			: undefined}
	data-sveltekit-keepfocus
	class="card"
	class:is-active={paramsFromFragment($page.url).get(overlayKey.enum.view) === container.guid ||
		paramsFromFragment($page.url).get(overlayKey.enum.relate) === container.guid}
	class:is-highlighted={selected && highlightColor(container, selected)}
	style:--highlight-color={selected && highlightColor(container, selected)}
	on:click={handleClick}
	on:keyup={handleKeyUp}
>
	<header>
		<h3>
			<a href={containerPreviewURL} bind:this={previewLink} on:click={updateOverlayHistory}>
				{#if 'title' in container.payload}
					{container.payload.title}
				{:else if 'name' in container.payload}
					{container.payload.name}
				{/if}
			</a>
		</h3>
		{#if selected && relationIcon(container, selected)}
			<span>
				<svelte:component this={relationIcon(container, selected)} />
			</span>
		{/if}
	</header>

	<div class="content">
		{#if isIndicatorContainer(container)}
			{#await Promise.all([containersWithObjectivesPromise, relatedContainersPromise])}
				<IndicatorChart {container} />
			{:then [containersWithObjectives, relatedContainers]}
				<IndicatorChart
					{container}
					{relatedContainers}
					{containersWithObjectives}
					showEffects
					showObjectives
				/>
			{/await}
			<p class="badges">
				{#each container.payload.indicatorType as indicatorType}
					<span class="badge">{$_(indicatorType)}</span>
				{/each}

				{#each container.payload.indicatorCategory as indicatorCategory}
					<span class="badge">{$_(indicatorCategory)}</span>
				{/each}
			</p>
		{:else if isEffectContainer(container)}
			{#await relatedContainersPromise then relatedContainers}
				{@const indicator = relatedContainers.find(isIndicatorContainer)}
				{#if indicator}
					<IndicatorChart container={indicator} {relatedContainers} showEffects />
				{/if}
			{/await}
		{:else if isSimpleMeasureContainer(container)}
			<Progress value={container.payload.progress} compact />
		{:else if 'image' in container.payload}
			<img alt={$_('cover_image')} src={container.payload.image} />}
		{:else if 'summary' in container.payload || 'description' in container.payload}
			<Summary {container} />
		{/if}
	</div>

	<footer>
		{#if 'indicator' in container.payload && container.payload.indicator.length > 0}
			<ProgressBar
				guid={container.guid}
				indicator={container.payload.indicator[0]}
				contributors={relatedContainers}
				compact
			/>
		{:else if 'status' in container.payload}
			<span class="badge badge--{statusColors.get(container.payload.status)}">
				<svelte:component this={statusIcons.get(container.payload.status) ?? LightBulb} />
				{$_(container.payload.status)}
			</span>
		{:else if 'taskStatus' in container.payload}
			<span class="badge badge--{taskStatusColors.get(container.payload.taskStatus)}">
				<svelte:component this={taskStatusIcons.get(container.payload.taskStatus) ?? LightBulb} />
				{$_(container.payload.taskStatus)}
			</span>
		{:else if 'progress' in container.payload}
			<Progress value={container.payload.progress} compact />
		{:else if 'strategyType' in container.payload}
			<span class="badge">{$_(container.payload.strategyType)}</span>
		{:else if 'indicatorType' in container.payload}
			<span></span>
		{/if}
		<slot name="button">
			{#if showRelationFilter}
				<button
					class="relation-button"
					title={$_('show_relations')}
					class:is-active={relatedTo === container.guid}
					on:click|stopPropagation={() => applyRelationFilter($page.url)}
				>
				</button>
			{/if}
		</slot>
	</footer>
</article>

<style>
	.card {
		background: #ffffff;
		border: 1px solid var(--color-gray-200);
		border-radius: 8px;
		box-shadow: var(--shadow-md);
		cursor: pointer;
		display: flex;
		flex-direction: column;
		height: var(--height, auto);
		hyphens: auto;
		padding: 1.25rem;
		width: 100%;
		word-break: break-word;
	}

	.card:hover,
	.card.is-active {
		border-color: var(--hover-border-color, var(--color-hover-neutral));
		border-width: 3px;
		outline: none;
		padding: calc(1.25rem - 2px);
	}

	.card.is-highlighted {
		border-color: var(--highlight-color, var(--color-gray-200));
		border-width: 3px;
		padding: calc(1.25rem - 2px);
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
		align-items: center;
		display: flex;
		margin-bottom: 1rem;
	}

	header h3 {
		font-size: 1rem;
		font-weight: 700;
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

	.content {
		color: var(--color-gray-500);
		font-size: 0.875rem;
		font-weight: 500;
		margin-bottom: 1rem;
	}

	.badges {
		display: flex;
		flex-direction: row;
		flex-wrap: wrap;
		gap: 0.25rem;
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
</style>
