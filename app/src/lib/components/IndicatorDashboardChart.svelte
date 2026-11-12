<script lang="ts">
	import * as Plot from '@observablehq/plot';
	import type { Attachment } from 'svelte/attachments';
	import { _, number } from 'svelte-i18n';
	import { indicatorActualData } from '$lib/indicatorActualData';
	import {
		indicatorChartOptions,
		ownColor,
		textWidthIn,
		valueExtent,
		yearDomain
	} from '$lib/indicatorChart';
	import type { AnyPayload, Container, IndicatorPayload } from '$lib/models';

	interface Props {
		container: Container<IndicatorPayload>;
		relatedContainers: Container<AnyPayload>[];
		// A sparkline is the line alone, without axes
		variant: 'chart' | 'sparkline';
	}

	let { container, relatedContainers, variant }: Props = $props();

	const data = $derived(
		indicatorActualData(container.guid, relatedContainers).map(([year, value]) => ({
			year,
			value
		}))
	);

	const first = $derived(Math.min(...data.map(({ year }) => year)));

	const last = $derived(Math.max(...data.map(({ year }) => year)));

	let width = $state(0);

	let height = $state(0);

	// The chart marks every value with a point like the charts elsewhere, so that years without
	// data can be told apart. The sparkline needs one only for a single value.
	function line(strokeWidth: number, points: 'every' | 'single') {
		return [
			Plot.lineY(data, {
				x: 'year',
				y: 'value',
				stroke: ownColor,
				strokeLinecap: 'round',
				strokeWidth
			}),
			...(points === 'every' || data.length === 1
				? [Plot.dot(data, { x: 'year', y: 'value', fill: ownColor, r: 4 })]
				: [])
		];
	}

	function sparkline() {
		const [lowest, highest] = valueExtent(data.map(({ value }) => value));
		const padding = (highest - lowest) * 0.08;
		return Plot.plot({
			height,
			margin: 2,
			marks: line(2, 'single'),
			width,
			x: { axis: null, domain: yearDomain(data.map(({ year }) => year)), type: 'linear' },
			y: { axis: null, domain: [lowest - padding, highest + padding] }
		});
	}

	// Axes, grid and lines as in the other charts of indicators; only the height is the card's.
	function chart(element: HTMLElement) {
		const options = indicatorChartOptions({
			extent: valueExtent(data.map(({ value }) => value)),
			format: (value) => $number(value),
			height,
			textWidth: textWidthIn(element),
			width,
			years: data.map(({ year }) => year)
		});
		return Plot.plot({ ...options, marks: [...options.marks, ...line(3, 'every')] });
	}

	const render: Attachment<HTMLElement> = (element) => {
		if (width === 0 || height === 0 || data.length === 0) {
			return;
		}
		element.replaceChildren(variant === 'sparkline' ? sparkline() : chart(element));
	};
</script>

{#if data.length === 0}
	<p class="no-data">{$_('indicator.no_data')}</p>
{:else}
	<figure>
		{#if variant === 'chart'}
			<span class="unit">{$_(container.payload.unit)}</span>
		{/if}
		<div
			aria-label={$_('indicator_dashboard.chart_label', {
				values: { first: String(first), last: String(last), title: container.payload.title }
			})}
			bind:clientHeight={height}
			bind:clientWidth={width}
			class="plot"
			role="img"
			{@attach render}
		></div>
	</figure>
{/if}

<style>
	figure {
		display: flex;
		flex: 1;
		flex-direction: column;
		margin: 0;
		min-height: 0;
	}

	.unit {
		color: var(--chart-axis-text);
		font-size: 0.75rem;
		line-height: 1.5;
	}

	.plot {
		color: var(--chart-axis-text);
		flex: 1;
		font-size: 0.75rem;
		min-height: 0;
		position: relative;
	}

	.plot :global(svg) {
		inset: 0;
		position: absolute;
	}

	.no-data {
		align-content: center;
		color: var(--color-text-default);
		flex: 1;
		font-size: 0.875rem;
		font-weight: 500;
		margin: 0;
		text-align: center;
	}
</style>
