<script lang="ts">
	import { Icon, LightBulb, Share } from 'svelte-hero-icons';
	import { _ } from 'svelte-i18n';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import paramsFromURL from '$lib/client/paramsFromURL';
	import Progress from '$lib/components/Progress.svelte';
	import ProgressBar from '$lib/components/ProgressBar.svelte';
	import { predicates } from '$lib/models';
	import type { AnyContainer, Container } from '$lib/models';
	import { overlay } from '$lib/stores';
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

	$: relatedTo = $page.url.searchParams.get('related-to');

	$: if ($overlay.object) {
		selected = $overlay.object;
	} else if (relatedTo && $page.data.containers) {
		selected = $page.data.containers.find(({ guid }: Container) => guid == relatedTo);
	} else if ($page.data.container) {
		selected = $page.data.container;
	} else {
		selected = undefined;
	}

	async function applyRelationFilter(params: URLSearchParams) {
		const query = new URLSearchParams(params);
		if (relatedTo === container.guid) {
			query.delete('related-to');
		} else {
			query.delete('related-to');
			query.append('related-to', container.guid);
		}
		await goto(`?${query.toString()}`);
	}

	let containerPreviewURL: string;

	$: {
		const hashParams = paramsFromURL($page.url);
		if (hashParams.get('view') === container.guid) {
			containerPreviewURL = '#';
		} else {
			hashParams.set('view', container.guid);
			hashParams.delete('create');
			containerPreviewURL = `#${hashParams.toString()}`;
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
	class:is-active={paramsFromURL($page.url).get('view') === container.guid}
	class:is-highlighted={selected && highlightColor(container, selected)}
	style:--highlight-color={selected && highlightColor(container, selected)}
	on:click={handleClick}
	on:keyup={handleKeyUp}
>
	<header>
		<h3>
			<a href={containerPreviewURL} bind:this={previewLink}>
				{#if 'title' in container.payload}
					{container.payload.title}
				{:else if 'name' in container.payload}
					{container.payload.name}
				{/if}
			</a>
		</h3>
		{#if selected && relationIcon(container, selected)}
			<span>
				<Icon src={relationIcon(container, selected)} size="24" />
			</span>
		{/if}
	</header>

	{#if 'summary' in container.payload}
		<p class="text">
			{container.payload.summary ?? ''}
		</p>
	{:else if 'image' in container.payload}
		<img alt={$_('cover_image')} class="text" src={container.payload.image} />
	{/if}

	<footer>
		{#if 'indicator' in container.payload && container.payload.indicator.length > 0}
			<ProgressBar
				guid={container.guid}
				indicator={container.payload.indicator[0]}
				contributors={relatedContainers}
				compact
			/>
		{:else if 'progress' in container.payload}
			<Progress value={container.payload.progress} compact />
		{:else if 'status' in container.payload}
			<span class="badge badge--{statusColors.get(container.payload.status)}">
				<Icon src={statusIcons.get(container.payload.status) ?? LightBulb} size="16" mini />
				{$_(container.payload.status)}
			</span>
		{:else if 'taskStatus' in container.payload}
			<span class="badge badge--{taskStatusColors.get(container.payload.taskStatus)}">
				<Icon src={taskStatusIcons.get(container.payload.taskStatus) ?? LightBulb} size="16" mini />
				{$_(container.payload.taskStatus)}
			</span>
		{:else if 'strategyType' in container.payload}
			<span class="badge">{$_(container.payload.strategyType)}</span>
		{/if}
		{#if showRelationFilter}
			<button
				class={relatedTo === container.guid ? 'is-active' : ''}
				title={$_('show_related_objects')}
				on:click|stopPropagation={() => applyRelationFilter($page.url.searchParams)}
			>
				<Icon src={Share} size="20" mini />
			</button>
		{/if}
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
	}

	header span {
		flex-shrink: 0;
		margin-left: auto;
	}

	.text {
		color: var(--color-gray-500);
		font-size: 0.875rem;
		font-weight: 500;
		margin-bottom: 1rem;
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

	footer button:last-child {
		--button-border-color: var(--color-primary);
		--padding-x: 0.625rem;
		--padding-y: 0.625rem;

		flex-grow: 0;
		flex-shrink: 0;
		margin-left: auto;

		color: var(--color-primary);
	}

	footer button:last-child:hover {
		background: var(--gradient-primary);
		color: white;
	}
</style>
