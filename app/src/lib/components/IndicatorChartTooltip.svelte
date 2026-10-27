<script module lang="ts">
	export interface IndicatorChartTooltipItem {
		color?: string;
		label: string;
		value: string;
	}

	export interface IndicatorChartTooltipContent {
		items: IndicatorChartTooltipItem[];
		title: string;
	}
</script>

<script lang="ts" generics="T">
	import { Tooltip } from 'layerchart';
	import arrow from '$lib/assets/tooltip-arrow.svg';

	interface Props {
		// Derives title and items from the datum the pointer is on
		content: (datum: T) => IndicatorChartTooltipContent;
	}

	let { content }: Props = $props();
</script>

<!-- Centered above the hovered column, so that the arrow points to it -->
<Tooltip.Root anchor="bottom" contained="window" variant="none" x="data" y="pointer" yOffset={4}>
	{#snippet children({ data })}
		{@const { items, title } = content(data)}
		<div class="indicator-chart-tooltip">
			<div class="text">
				<div class="title">{title}</div>
				<ul>
					{#each items as item, i (i)}
						<li>
							{#if item.color}
								<span class="swatch" style:background-color={item.color}></span>
							{/if}
							<span class="label truncated">{item.label}</span>
							<span class="value">{item.value}</span>
						</li>
					{/each}
				</ul>
			</div>
			<img alt="" class="arrow" height="7.58579" src={arrow} width="16.8284" />
		</div>
	{/snippet}
</Tooltip.Root>

<style>
	.indicator-chart-tooltip {
		align-items: center;
		display: flex;
		filter: drop-shadow(0 4px 3px rgba(0, 0, 0, 0.1)) drop-shadow(0 2px 2px rgba(0, 0, 0, 0.05));
		flex-direction: column;
	}

	.text {
		background-color: var(--color-surface-inverse);
		border-radius: 4px;
		display: flex;
		flex-direction: column;
		font-size: 0.75rem;
		gap: 0.375rem;
		line-height: 1.5;
		max-width: 15rem;
		padding: 0.25rem 0.5rem;
		width: max-content;
	}

	.title {
		color: var(--color-text-on-inverse);
		font-weight: 500;
	}

	ul {
		display: grid;
		gap: 0 0.5rem;
		grid-template-columns: auto minmax(0, 1fr) auto;
		list-style: none;
		margin: 0;
		padding: 0;
	}

	li {
		align-items: center;
		display: contents;
	}

	.swatch {
		align-self: center;
		border-radius: 2px;
		grid-column: 1;
		height: 0.5rem;
		width: 0.5rem;
	}

	.label {
		color: var(--color-text-muted);
		grid-column: 2;
	}

	.value {
		color: var(--color-text-on-inverse);
		font-variant-numeric: tabular-nums;
		grid-column: 3;
		text-align: right;
		white-space: nowrap;
	}

	.arrow {
		display: block;
	}
</style>
