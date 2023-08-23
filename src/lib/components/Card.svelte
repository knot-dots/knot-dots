<script lang="ts">
	import { Icon, LightBulb, Share } from 'svelte-hero-icons';
	import { _ } from 'svelte-i18n';
	import { page } from '$app/stores';
	import Progress from '$lib/components/Progress.svelte';
	import ProgressBar from '$lib/components/ProgressBar.svelte';
	import type { Container } from '$lib/models';
	import { statusColors, statusIcons, taskStatusColors, taskStatusIcons } from '$lib/models';

	export let container: Container;
	export let relatedContainers: Container[] = [];
	export let showRelationFilter = false;

	$: relatedTo = $page.url.searchParams.get('related-to');
	let relatedToURL: string;
	let containerPreviewURL: string;

	$: {
		const query = new URLSearchParams($page.url.searchParams);
		if (query.get('container-preview') === container.guid) {
			query.delete('container-preview');
		} else {
			query.set('container-preview', container.guid);
		}
		containerPreviewURL = `?${query.toString()}`;
	}

	$: {
		const query = new URLSearchParams($page.url.searchParams);
		if (relatedTo === container.guid) {
			query.delete('related-to');
		} else {
			query.delete('related-to');
			query.append('related-to', container.guid);
		}
		relatedToURL = `?${query.toString()}`;
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
</script>

<!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
<article
	tabindex="-1"
	title={container.payload.title}
	data-sveltekit-keepfocus
	class="card"
	class:is-active={$page.url.searchParams.get('container-preview') === container.guid}
	on:click={handleClick}
	on:keyup={handleKeyUp}
>
	<header>
		<h3>
			<a href={containerPreviewURL} bind:this={previewLink}>
				{container.payload.title}
			</a>
		</h3>
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
			<a
				href={relatedToURL}
				class="button {relatedTo === container.guid ? 'is-active' : ''}"
				title={$_('show_related_objects')}
			>
				<Icon src={Share} size="20" mini />
			</a>
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
		padding: 1.25rem;
		width: 100%;
	}

	.card:hover,
	.card.is-active {
		background: var(--color-gray-300);
		outline: none;
	}

	header {
		margin-bottom: 1rem;
	}

	header h3 {
		font-size: 1rem;
		font-weight: 700;
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
	}

	footer :global(.progress) {
		flex-grow: 1;
	}

	footer .button:last-child {
		--padding-x: 0.625rem;
		--padding-y: 0.625rem;

		flex-grow: 0;
		flex-shrink: 0;
		margin-left: auto;
	}
</style>
