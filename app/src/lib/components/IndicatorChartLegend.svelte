<script module lang="ts">
	export interface IndicatorChartLegendItem {
		color: string;
		// Dashed outline of a rectangle or dashed line
		dashed?: boolean;
		label: string;
		shape: 'line' | 'rect';
	}
</script>

<script lang="ts">
	interface Props {
		items: IndicatorChartLegendItem[];
	}

	let { items }: Props = $props();
</script>

<ul class="chart-legend">
	{#each items as item, i (i)}
		<li>
			<svg width="24" height="10" aria-hidden="true">
				{#if item.shape === 'rect'}
					<rect
						height="8"
						rx="1"
						width="12"
						x="6"
						y="1"
						style:fill={item.color}
						style:stroke={item.dashed ? 'var(--color-gray-900)' : undefined}
						style:stroke-dasharray={item.dashed ? '2' : undefined}
					/>
				{:else}
					<line
						x1="2"
						y1="5"
						x2="22"
						y2="5"
						style:stroke={item.color}
						style:stroke-dasharray={item.dashed ? '4' : undefined}
						style:stroke-linecap="round"
						style:stroke-width="3"
					/>
				{/if}
			</svg>
			<span>{item.label}</span>
		</li>
	{/each}
</ul>

<style>
	.chart-legend {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem 0.75rem;
		list-style: none;
		margin: 0;
		padding: 0;
		font-size: 0.75rem;
	}

	.chart-legend li {
		align-items: center;
		display: flex;
		gap: 0.25rem;
	}
</style>
