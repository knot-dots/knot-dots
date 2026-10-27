<script module lang="ts">
	export interface ColumnDatum {
		key: string;
		value: number;
		year: number;
	}

	export interface TargetDatum {
		label: string;
		value: number;
		year: number;
	}
</script>

<script lang="ts">
	import { BarChart, Bars, Highlight, Line } from 'layerchart';
	import { number } from 'svelte-i18n';
	import IndicatorChartTooltip from '$lib/components/IndicatorChartTooltip.svelte';

	interface Props {
		colorDomain: string[];
		colorRange: string[];
		data: ColumnDatum[];
		// Key of the series that stands out from the others, e.g. the own municipality
		emphasized?: string;
		labels: Map<string, string>;
		layout: 'group' | 'stack';
		// Target values drawn as a dashed mark across the column of their year
		targets?: TargetDatum[];
		targetColor?: string;
		// Value shown in the tooltip if it differs from the height of the column segment
		tooltipValue?: (datum: ColumnDatum) => number;
		unit: string;
	}

	let {
		colorDomain,
		colorRange,
		data,
		emphasized,
		labels,
		layout,
		targets = [],
		targetColor = 'var(--indicator-color-objective)',
		tooltipValue = ({ value }) => value,
		unit
	}: Props = $props();

	// Bars of a series missing in the domain would otherwise get an arbitrary color
	let visibleData = $derived(data.filter(({ key }) => colorDomain.includes(key)));

	let years = $derived(
		[...new Set([...visibleData, ...targets].map(({ year }) => year))].toSorted((a, b) => a - b)
	);

	// Series in the order of the domain, which is the stacking order from bottom to top
	let keys = $derived(colorDomain.filter((key) => visibleData.some((d) => d.key === key)));

	// Stacked explicitly so that the order follows the domain
	let chartData = $derived.by(() => {
		const offsets = new Map<number, number>();
		return keys.flatMap((key) =>
			visibleData
				.filter((d) => d.key === key)
				.map((d) => {
					const y0 = layout === 'stack' ? (offsets.get(d.year) ?? 0) : 0;
					offsets.set(d.year, y0 + d.value);
					return { ...d, y0, y1: y0 + d.value };
				})
		);
	});

	let yDomain = $derived.by(() => {
		const all = [
			...chartData.flatMap(({ y0, y1 }) => [y0, y1]),
			...targets.map(({ value }) => value)
		];
		return [Math.min(0, ...all), Math.max(0, ...all)];
	});

	// Room for the longest label of the value axis, whose labels are 12px. The labels are
	// estimated from steps of 1, 2 or 5 times a power of ten, like the ticks of the axis, so that
	// decimal places are taken into account.
	let paddingLeft = $derived.by(() => {
		const [min, max] = yDomain;
		const rough = (max - min || 1) / 10;
		const power = 10 ** Math.floor(Math.log10(rough));
		const step = [1, 2, 5, 10].map((f) => f * power).find((s) => s >= rough) ?? 10 * power;
		const labels = [];
		for (let i = Math.floor(min / step); i <= Math.ceil(max / step); i++) {
			labels.push($number(Number((i * step).toPrecision(12))));
		}
		return Math.max(32, ...labels.map((label) => label.length * 7 + 12));
	});

	// A tap ends with the pointer leaving the chart, so it pins the tooltip until the next tap
	let locked = $state(false);

	function toggleLocked(event: MouseEvent) {
		if (event instanceof PointerEvent && event.pointerType !== 'mouse') {
			locked = !locked;
		}
	}

	let element: HTMLElement | undefined = $state();

	// Scrolling or tapping elsewhere releases a pinned tooltip
	$effect(() => {
		if (!locked) {
			return;
		}

		const unlock = (event: Event) => {
			if (!(event.target instanceof Node && element?.contains(event.target))) {
				locked = false;
			}
		};

		window.addEventListener('pointerdown', unlock, true);
		window.addEventListener('scroll', unlock, { capture: true, passive: true });

		return () => {
			window.removeEventListener('pointerdown', unlock, true);
			window.removeEventListener('scroll', unlock, true);
		};
	});

	// Keeps columns readable when there are only a few years
	const maxColumnWidth = 48;

	// Target marks reach a little beyond their column on both sides
	const targetOverhang = 4;

	// Width taken up by the label of a year including the space around it
	const yearLabelWidth = 40;

	// Labels every year if there is enough space, otherwise every second, third, … year
	// counting back from the last one so that the most recent year is always labeled
	function yearTicks(scale: { range: () => number[] }) {
		const [start, end] = scale.range();
		const step = Math.max(1, Math.ceil((years.length * yearLabelWidth) / Math.abs(end - start)));
		return years.filter((_, i) => (years.length - 1 - i) % step === 0);
	}

	function colorFor(key: string) {
		return colorRange[colorDomain.indexOf(key)];
	}

	function format(value: number) {
		return `${$number(value)} ${unit}`;
	}

	function tooltipContent({ year }: ColumnDatum) {
		return {
			items: [
				...keys.flatMap((key) =>
					visibleData
						.filter((d) => d.year === year && d.key === key)
						.slice(0, 1)
						.map((d) => ({
							color: colorFor(key),
							label: labels.get(key) ?? key,
							value: format(tooltipValue(d))
						}))
				),
				...targets
					.filter((d) => d.year === year)
					.map((d) => ({
						color: targetColor,
						label: d.label,
						value: format(d.value)
					}))
			],
			title: String(year)
		};
	}
</script>

<div bind:this={element} class="chart" role="img">
	<BarChart
		axis
		cDomain={colorDomain}
		cRange={colorRange}
		c="key"
		data={chartData}
		grid
		highlight={false}
		legend={false}
		onTooltipClick={toggleLocked}
		padding={{ bottom: 24, left: paddingLeft, right: 8, top: 16 }}
		props={{
			xAxis: { format: (d: number) => String(d), ticks: yearTicks },
			yAxis: { format: (d: number) => $number(d), label: unit, labelPlacement: 'start' }
		}}
		seriesLayout={layout === 'group' ? 'group' : 'overlap'}
		tooltipContext={{ locked }}
		x="year"
		x1={layout === 'group' ? 'key' : undefined}
		x1Domain={layout === 'group' ? keys : undefined}
		xDomain={years}
		y={['y0', 'y1']}
		{yDomain}
		yNice
	>
		<!-- Behind the columns, so that the hovered column keeps its colors -->
		{#snippet belowMarks()}
			<Highlight area={{ fill: 'var(--color-gray-500)', fillOpacity: 0.1 }} />
		{/snippet}

		{#snippet marks({ context })}
			{#if layout === 'group'}
				{#each keys as key (key)}
					<Bars
						data={chartData.filter((d) => d.key === key)}
						fill={colorFor(key)}
						fillOpacity={emphasized === undefined || emphasized === key ? 1 : 0.75}
						radius={2}
						rounded="top"
						stroke="none"
						width={Math.min(context.x1Scale?.bandwidth?.() ?? maxColumnWidth, maxColumnWidth)}
					/>
				{/each}
			{:else}
				{#each keys as key (key)}
					<Bars
						data={chartData.filter((d) => d.key === key)}
						fill={colorFor(key)}
						rounded="none"
						stroke="none"
						width={Math.min(context.xScale.bandwidth?.() ?? maxColumnWidth, maxColumnWidth)}
					/>
				{/each}
			{/if}
		{/snippet}

		{#snippet aboveMarks({ context })}
			{@const bandwidth = context.xScale.bandwidth?.() ?? 0}
			{@const width = Math.min(bandwidth, maxColumnWidth) + targetOverhang * 2}
			{#each targets as target, i (i)}
				{@const x = context.xScale(target.year) + (bandwidth - width) / 2}
				{@const y = context.yScale(target.value)}
				<!-- Keeps the mark visible on columns of any color -->
				<Line
					stroke="var(--color-surface-default)"
					strokeWidth={4}
					x1={x}
					x2={x + width}
					y1={y}
					y2={y}
				/>
				<Line
					dashArray="6 3"
					stroke={targetColor}
					strokeWidth={2}
					x1={x}
					x2={x + width}
					y1={y}
					y2={y}
				/>
			{/each}
		{/snippet}

		{#snippet tooltip()}
			<IndicatorChartTooltip content={tooltipContent} />
		{/snippet}
	</BarChart>
</div>

<style>
	.chart {
		aspect-ratio: 8 / 5;
		font-size: 0.75rem;
		width: 100%;
	}
</style>
