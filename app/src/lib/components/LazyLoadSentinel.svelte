<script lang="ts">
	import type { Snippet } from 'svelte';
	import { _ } from 'svelte-i18n';

	interface Props {
		as?: 'div' | 'li';
		disabled?: boolean;
		hasMore: boolean;
		loading?: boolean;
		loadingContent?: Snippet;
		onLoadMore: () => void;
		rootMargin?: string;
	}

	let {
		as = 'div',
		disabled = false,
		hasMore,
		loading = false,
		loadingContent,
		onLoadMore,
		rootMargin = '200px'
	}: Props = $props();

	let sentinel: HTMLElement | undefined = $state(undefined);

	$effect(() => {
		if (!sentinel || disabled) return;

		const observer = new IntersectionObserver(
			(entries) => {
				if (entries[0].isIntersecting && hasMore && !loading && !disabled) {
					onLoadMore();
				}
			},
			{
				threshold: 0,
				rootMargin
			}
		);

		observer.observe(sentinel);

		return () => {
			observer.disconnect();
		};
	});
</script>

{#if hasMore}
	<svelte:element this={as} bind:this={sentinel} class="load-more-sentinel">
		{#if loading}
			{#if loadingContent}
				{@render loadingContent()}
			{:else}
				<span class="loading-indicator">{$_('loading')}</span>
			{/if}
		{/if}
	</svelte:element>
{/if}

<style>
	.load-more-sentinel {
		display: flex;
		justify-content: center;
		min-height: 2rem;
		padding: 1rem 0;
	}

	.loading-indicator {
		color: var(--color-gray-600);
		font-size: 0.875rem;
	}
</style>
