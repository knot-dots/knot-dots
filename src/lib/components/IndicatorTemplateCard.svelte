<script lang="ts">
	import { getContext } from 'svelte';
	import { _ } from 'svelte-i18n';
	import { page } from '$app/stores';
	import { overlayKey, overlayURL, paramsFromFragment } from '$lib/models';
	import type { IndicatorTemplateContainer } from '$lib/models';
	import { overlayHistory } from '$lib/stores';

	export let container: IndicatorTemplateContainer;

	let overlayContext = getContext('overlay');

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
</script>

<!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
<article
	tabindex="-1"
	title={container.payload.title}
	data-sveltekit-keepfocus
	class="card"
	class:is-active={paramsFromFragment($page.url).get(overlayKey.enum.view) === container.guid}
	on:click={handleClick}
	on:keyup={handleKeyUp}
>
	<header>
		<h3>
			<a href={containerPreviewURL} bind:this={previewLink} on:click={updateOverlayHistory}>
				{container.payload.title}
			</a>
		</h3>
	</header>

	<p class="text">
		{container.payload.description ?? ''}
	</p>

	<footer>
		{#each container.payload.indicatorCategory as indicatorCategory}
			<span class="badge">{$_(indicatorCategory)}</span>
		{/each}
		<slot name="button"></slot>
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

	header {
		align-items: center;
		display: flex;
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
		margin-top: auto;
	}
</style>
