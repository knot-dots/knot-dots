<script lang="ts">
	import { _ } from 'svelte-i18n';

	interface Props {
		class?: string;
		// Number of cards, text lines, table rows or chart tiles
		count?: number;
		// Limits a card grid to this many rows, whatever the number of columns
		rows?: number;
		variant?: 'card' | 'chart' | 'table' | 'text';
	}

	let { class: className, count, rows, variant = 'text' }: Props = $props();

	const defaultCount = { card: 6, chart: 3, table: 5, text: 3 };

	const items = $derived(Array.from({ length: count ?? defaultCount[variant] }, (_, i) => i));
</script>

<div
	aria-busy="true"
	class={[
		'skeleton',
		`skeleton--${variant}`,
		variant === 'card' && 'catalog',
		rows && 'skeleton--limited',
		className
	]}
	style:--skeleton-rows={rows}
>
	<span class="is-visually-hidden">{$_('loading')}</span>

	{#if variant === 'card'}
		{#each items as item (item)}
			<div aria-hidden="true" class="skeleton-card">
				<span class="skeleton-shape skeleton-shape--heading"></span>
				<span class="skeleton-shape skeleton-shape--line"></span>
				<span class="skeleton-shape skeleton-shape--line skeleton-shape--short"></span>
				<span class="skeleton-shape skeleton-shape--meta"></span>
			</div>
		{/each}
	{:else if variant === 'chart'}
		{#each items as item (item)}
			<div aria-hidden="true" class="skeleton-chart">
				<span class="skeleton-shape skeleton-shape--line skeleton-shape--short"></span>
				<span class="skeleton-shape skeleton-shape--plot"></span>
			</div>
		{/each}
	{:else if variant === 'table'}
		<div aria-hidden="true" class="skeleton-table">
			<span class="skeleton-shape skeleton-shape--table-head"></span>
			{#each items as item (item)}
				<span class="skeleton-shape skeleton-shape--line"></span>
			{/each}
		</div>
	{:else}
		{#each items as item (item)}
			<span aria-hidden="true" class="skeleton-shape skeleton-shape--line"></span>
		{/each}
	{/if}
</div>

<style>
	.skeleton {
		--skeleton-card-height: 10rem;
		--skeleton-line-height: 0.875rem;

		/* Appear only if loading takes a noticeable time to avoid flicker. */
		animation: skeleton-appear 0s 150ms both;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		width: 100%;
	}

	/* Uses the grid of .catalog so that cards line up with the real ones. */
	.skeleton.skeleton--card {
		display: grid;
		gap: 1rem;
	}

	.skeleton--card.skeleton--limited {
		max-height: calc(
			var(--skeleton-rows) * var(--skeleton-card-height) + (var(--skeleton-rows) - 1) * 1rem
		);
		overflow: hidden;
	}

	.skeleton--chart {
		display: grid;
		gap: 1rem;
		grid-template-columns: repeat(auto-fill, minmax(12rem, 1fr));
	}

	.skeleton-card,
	.skeleton-chart {
		border: 1px solid var(--color-gray-200);
		border-radius: var(--skeleton-border-radius);
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		height: var(--skeleton-card-height);
		justify-content: flex-end;
		padding: 1rem;
	}

	.skeleton-chart {
		justify-content: flex-start;
	}

	.skeleton-table {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.skeleton-shape {
		animation: skeleton-shimmer 1.5s ease-in-out infinite;
		background: linear-gradient(
			90deg,
			var(--skeleton-color) 25%,
			var(--skeleton-highlight-color) 50%,
			var(--skeleton-color) 75%
		);
		background-size: 400% 100%;
		border-radius: calc(var(--skeleton-border-radius) / 2);
		display: block;
		height: var(--skeleton-line-height);
		width: 100%;
	}

	.skeleton--text > .skeleton-shape:last-child:not(:only-of-type) {
		width: 60%;
	}

	.skeleton-shape--heading {
		height: 1.5rem;
		margin-bottom: auto;
		width: 70%;
	}

	.skeleton-shape--short {
		width: 60%;
	}

	.skeleton-shape--meta {
		height: 1.25rem;
		margin-top: 0.25rem;
		width: 40%;
	}

	.skeleton-shape--plot {
		flex: 1;
		height: auto;
	}

	.skeleton-shape--table-head {
		height: 2rem;
	}

	.skeleton-table > .skeleton-shape--line {
		height: 1.5rem;
	}

	@keyframes skeleton-appear {
		from {
			opacity: 0;
		}

		to {
			opacity: 1;
		}
	}

	@keyframes skeleton-shimmer {
		from {
			background-position: 100% 0;
		}

		to {
			background-position: 0 0;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.skeleton-shape {
			animation: none;
			background: var(--skeleton-color);
		}
	}
</style>
