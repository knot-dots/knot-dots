<script lang="ts">
	import type { OrganizationContainer } from '$lib/models';
	import { page } from '$app/stores';
	import { _ } from 'svelte-i18n';

	export let container: OrganizationContainer;

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
	title={container.payload.name}
	data-sveltekit-keepfocus
	class="card"
	class:is-active={$page.url.searchParams.get('container-preview') === container.guid}
	on:click={handleClick}
	on:keyup={handleKeyUp}
>
	<header>
		<h3>
			<a href={containerPreviewURL} bind:this={previewLink}>
				{container.payload.name}
			</a>
		</h3>
	</header>

	{#if 'image' in container.payload}
		<img alt={$_('image')} class="text" src={container.payload.image} />
	{/if}
</article>

<style>
	.card {
		background: #ffffff;
		border: 1px solid var(--color-gray-200);
		border-radius: 8px;
		box-shadow: var(--shadow-md);
		cursor: pointer;
		padding: 1.25rem;
		width: 20rem;
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
</style>
