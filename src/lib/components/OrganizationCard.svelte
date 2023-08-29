<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { page } from '$app/stores';
	import { env } from '$env/dynamic/public';
	import type { OrganizationContainer } from '$lib/models';

	export let container: OrganizationContainer;

	let organizationLink: HTMLAnchorElement;

	function handleClick(event: MouseEvent) {
		if (organizationLink == event.target) {
			return;
		}
		const isTextSelected = window.getSelection()?.toString();
		if (!isTextSelected) {
			organizationLink.click();
		}
	}

	function handleKeyUp(event: KeyboardEvent) {
		if (event.key == 'Enter') {
			organizationLink.click();
		}
	}

	function organizationURL(container: OrganizationContainer) {
		const url = new URL(env.PUBLIC_BASE_URL ?? '');
		url.hostname = `${container.payload.slug}.${url.hostname}`;
		url.pathname = `/${container.payload.type}/${container.guid}`;
		return url.toString();
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
			<a href={organizationURL(container)} bind:this={organizationLink}>
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
