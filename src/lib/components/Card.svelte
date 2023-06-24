<script lang="ts">
	import { Icon, LightBulb, Share } from 'svelte-hero-icons';
	import { _ } from 'svelte-i18n';
	import { page } from '$app/stores';
	import ProgressBar from '$lib/components/ProgressBar.svelte';
	import type { Container } from '$lib/models';
	import { filtersToggle, sidebarToggle, sortToggle } from '$lib/stores';
	import { statusColors, statusIcons } from '$lib/models';

	export let container: Container;

	export let relatedContainers: Container[] = [];

	$: relatedTo = $page.url.searchParams.get('related-to');
	let relatedToURL: string;
	let containerPreviewURL: string;

	$: {
		const query = new URLSearchParams($page.url.searchParams);
		query.delete('container-preview');
		query.append('container-preview', container.guid);
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

	function closeSidebar() {
		$sidebarToggle = false;
		$filtersToggle = false;
		$sortToggle = false;
	}
</script>

<a href={containerPreviewURL} on:click={closeSidebar}>
	<article
		class="card"
		class:is-active={$page.url.searchParams.get('container-preview') === container.guid}
	>
		<header>
			<h3>{container.payload.title}</h3>
		</header>
		<div class="text">
			{@html container.payload.summary ?? ''}
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
					<Icon src={statusIcons.get(container.payload.status) ?? LightBulb} size="16" mini />
					{$_(container.payload.status)}
				</span>
			{:else if 'topic' in container.payload}
				<span class="badge">{$_(container.payload.topic)}</span>
			{/if}
			<a href={relatedToURL} class="button {relatedTo === container.guid ? 'is-active' : ''}">
				<Icon src={Share} size="20" mini />
			</a>
		</footer>
	</article>
</a>

<style>
	.card {
		background: #ffffff;
		border: 1px solid var(--color-gray-200);
		border-radius: 8px;
		box-shadow: var(--shadow-md);
		padding: 1.25rem;
		width: 100%;
	}

	.card.is-active {
		background: var(--color-gray-300);
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
	}

	.badge {
		--bg-color: var(--color-indigo-050);
		--color: var(--color-indigo-500);

		align-items: center;
		background-color: var(--bg-color);
		border-radius: 6px;
		color: var(--color);
		display: inline-flex;
		justify-content: center;
		gap: 0.25rem;
		padding: 0.125rem 0.75rem;
		text-align: center;
	}

	.badge.badge--red {
		--bg-color: var(--color-red-050);
		--color: var(--color-red-600);
	}

	.badge.badge--orange {
		--bg-color: var(--color-orange-050);
		--color: var(--color-orange-600);
	}

	.badge.badge--yellow {
		--bg-color: var(--color-yellow-050);
		--color: var(--color-yellow-400);
	}

	.badge.badge--green {
		--bg-color: var(--color-green-050);
		--color: var(--color-green-500);
	}
</style>
