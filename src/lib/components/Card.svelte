<script lang="ts">
	import { Icon, Share } from 'svelte-hero-icons';
	import { page } from '$app/stores';
	import { filtersToggle, sidebarToggle, sortToggle } from '$lib/stores';

	export let guid: string;
	export let title: string;
	export let summary: string;
	export let category: string;

	$: relatedTo = $page.url.searchParams.get('related-to');
	let relatedToURL: string;
	let containerPreviewURL: string;

	$: {
		const query = new URLSearchParams($page.url.searchParams);
		query.delete('container-preview');
		query.append('container-preview', guid);
		containerPreviewURL = `?${query.toString()}`
	}

	$: {
		const query = new URLSearchParams($page.url.searchParams);
		if (relatedTo === guid) {
			query.delete('related-to');
		} else {
			query.delete('related-to');
			query.append('related-to', guid);
		}
		relatedToURL = `?${query.toString()}`
	}

	function closeSidebar() {
		$sidebarToggle = false;
		$filtersToggle = false;
		$sortToggle = false;
	}
</script>

<a href={containerPreviewURL} on:click={closeSidebar}>
	<article class="card">
		<header>
			<h3>{title}</h3>
			<a
				href={relatedToURL}
				class="header-icons button quiet {relatedTo === guid ? 'is-active' : ''}"
			>
				<Icon src={Share} size="20" />
			</a>
		</header>
		<div class="text">
			{@html summary}
		</div>
		<footer>
			<div class="badges">
				<span class="badge">{category}</span>
			</div>
		</footer>
	</article>
</a>


<style>
	.card {
		box-sizing: border-box;
		width: 100%;
		padding: 20px;
		background: #ffffff;
		border: 1px solid var(--color-gray-200);
		box-shadow: var(--shadow-md);
		border-radius: 8px;
	}

	header {
		align-items: center;
		display: flex;
		justify-content: space-between;
	}

	header h3 {
		font-size: 1rem;
		font-weight: 700;
	}

	.header-icons {
		--padding-x: 12px;
		--padding-y: 12px;
		flex-shrink: 0;
	}

	:global(.header-icons svg) {
		stroke-width: 2.5px;
	}

	.text {
		font-weight: 500;
		font-size: 0.875rem;

		color: var(--color-gray-500);
		margin-top: 20px;
	}

	.badges {
		display: flex;
		flex-direction: row;
		align-items: flex-start;
		gap: 12px;
		margin-top: 20px;
	}

	.badge {
		text-align: center;
		padding: 3px 10px;
		background: var(--color-red-300);
		border-radius: 6px;
	}
</style>
