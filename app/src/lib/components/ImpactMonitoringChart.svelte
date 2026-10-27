<script lang="ts">
	import * as Plot from '@observablehq/plot';
	import type { Attachment } from 'svelte/attachments';
	import { _, number } from 'svelte-i18n';
	import IndicatorChartLegend from '$lib/components/IndicatorChartLegend.svelte';
	import IndicatorColumnChart from '$lib/components/IndicatorColumnChart.svelte';
	import { indicatorActualData, indicatorActualDataContainers } from '$lib/indicatorActualData';
	import {
		type Container,
		findAncestors,
		findLeafObjectives,
		type IndicatorPayload,
		isContainerWithEffect,
		isEffectContainer,
		isObjectiveContainer,
		predicates,
		status
	} from '$lib/models';

	interface Props {
		chartType?: 'line' | 'column';
		container: Container<IndicatorPayload>;
		relatedContainers?: Container[];
		showLegend?: boolean;
	}

	let {
		chartType = 'line',
		container,
		relatedContainers = [],
		showLegend = false
	}: Props = $props();

	let isColumnChart = $derived(chartType === 'column');

	let unit = $derived($_(container.payload.unit));

	let actualDataContainer = $derived(
		indicatorActualDataContainers(container.guid, relatedContainers)
	);

	let actualValues = $derived(
		indicatorActualData(container.guid, relatedContainers).map(([year, value]) => ({
			date: new Date(year, 0),
			value
		}))
	);

	let actualValuesByYear = $derived(
		new Map(actualValues.map(({ date, value }) => [date.getFullYear(), value]))
	);

	const colorDomain = [
		status.enum['status.idea'],
		status.enum['status.in_planning'],
		status.enum['status.in_implementation'],
		status.enum['status.done'],
		'trend',
		'objective'
	];

	const colorRange = [
		'var(--indicator-color-idea)',
		'var(--indicator-color-in-planning)',
		'var(--indicator-color-in-implementation)',
		'var(--indicator-color-done)',
		'var(--indicator-color-trend-area)',
		'var(--indicator-color-trend-line)',
		'var(--indicator-color-objective)'
	];

	let objectives = $derived.by(() => {
		let objectives = findLeafObjectives(relatedContainers.filter(isObjectiveContainer))
			.flatMap(({ payload }) => payload.wantedValues)
			.reduce(
				(accumulator, currentValue) => {
					const groupIndex = accumulator.findIndex(([year]) => currentValue[0] == year);
					return groupIndex > -1
						? [
								...accumulator.slice(0, groupIndex),
								[currentValue[0], currentValue[1] + accumulator[groupIndex][1]],
								...accumulator.slice(groupIndex + 1)
							]
						: [...accumulator, currentValue];
				},
				[] as Array<Array<number>>
			)
			.map(([year, value]) => ({
				date: new Date(year, 0),
				value: (actualValuesByYear.get(year) ?? 0) + value
			}));

		const objectivesMinYear = Math.min(...objectives.map(({ date }) => date.getFullYear()));

		if (objectives.length > 0) {
			objectives = [
				{
					date: new Date(objectivesMinYear - 1, 0),
					value: actualValuesByYear.get(objectivesMinYear - 1) ?? 0
				},
				...objectives
			];
		}

		return objectives;
	});

	let effects = $derived(
		relatedContainers.filter(isEffectContainer).flatMap((c) => {
			const measure = findAncestors(c, relatedContainers, [
				predicates.enum['is-part-of'],
				predicates.enum['is-part-of-measure']
			]).find(isContainerWithEffect);

			if (!measure) {
				return [];
			}

			if (measure.payload.status == status.enum['status.done']) {
				return c.payload.achievedValues.map(([year, value]) => ({
					date: new Date(year, 0),
					value: value,
					status: status.enum['status.done'],
					title: c.payload.title,
					guid: c.guid
				}));
			} else if (measure.payload.status == status.enum['status.in_implementation']) {
				return [
					...c.payload.plannedValues.map(([year, value], index) => ({
						date: new Date(year, 0),
						value: c.payload.achievedValues[index]
							? value - c.payload.achievedValues[index][1]
							: value,
						status: measure.payload.status,
						title: c.payload.title,
						guid: c.guid
					})),
					...c.payload.achievedValues.map(([year, value]) => ({
						date: new Date(year, 0),
						value: value,
						status: status.enum['status.done'],
						title: c.payload.title,
						guid: c.guid
					}))
				];
			} else if (measure.payload.status == status.enum['status.rejected']) {
				return c.payload.plannedValues.map(([year]) => ({
					date: new Date(year, 0),
					value: 0,
					status: measure.payload.status,
					title: c.payload.title,
					guid: c.guid
				}));
			} else {
				return c.payload.plannedValues.map(([year, value]) => ({
					date: new Date(year, 0),
					value: value,
					status: measure.payload.status,
					title: c.payload.title,
					guid: c.guid
				}));
			}
		})
	);

	let actualValuesWithEffects = $derived(
		effects[0]?.value < 0
			? [
					...effects.map(({ date, value, status }) => ({ date, value: Math.abs(value), status })),
					...actualValues.map(({ date, value }) => ({
						date,
						value:
							value -
							Math.abs(
								effects
									.filter((e) => e.date.getFullYear() == date.getFullYear())
									.reduce((accumulator, currentValue) => accumulator + currentValue.value, 0)
							),
						status: 'trend'
					}))
				]
			: [...effects, ...actualValues.map((t) => ({ ...t, status: 'trend' }))]
	);

	// Stacking order from bottom to top
	let columnOrder = $derived(
		effects[0]?.value < 0
			? [
					'trend',
					status.enum['status.idea'],
					status.enum['status.in_planning'],
					status.enum['status.in_implementation'],
					status.enum['status.done']
				]
			: [
					'trend',
					status.enum['status.done'],
					status.enum['status.in_implementation'],
					status.enum['status.in_planning'],
					status.enum['status.idea']
				]
	);

	let columnColors = $derived(
		columnOrder.map((key) => colorRange[colorDomain.indexOf(key)] ?? 'currentColor')
	);

	let columnLabels = $derived(
		new Map(
			columnOrder.map((key) => [key, key === 'trend' ? $_('indicator.table.actual_data') : $_(key)])
		)
	);

	// One column segment per year and status
	let columnData = $derived(
		[
			...actualValuesWithEffects
				.reduce((accumulator, { date, status, value }) => {
					const key = `${date.getFullYear()}-${status}`;
					const datum = accumulator.get(key) ?? {
						key: status,
						value: 0,
						year: date.getFullYear()
					};
					accumulator.set(key, { ...datum, value: datum.value + value });
					return accumulator;
				}, new Map<string, { key: string; value: number; year: number }>())
				.values()
		].filter(
			({ key, year }) =>
				columnOrder.includes(key) &&
				// Effects are stacked on the actual value of their year, so years without one are left
				// out, unless there are no actual values at all
				(actualValues.length === 0 || actualValuesByYear.has(year))
		)
	);

	// Only years with wanted values, unlike the line, which starts from the actual value before.
	// Wanted values are relative to the actual value, so years without one have no target.
	let objectiveTargets = $derived.by(() => {
		const leafObjectives = findLeafObjectives(relatedContainers.filter(isObjectiveContainer));
		return objectives.flatMap(({ date, value }) => {
			const titles = leafObjectives
				.filter(({ payload }) => payload.wantedValues.some(([year]) => year == date.getFullYear()))
				.map(({ payload }) => payload.title);
			return titles.length > 0 && actualValuesByYear.has(date.getFullYear())
				? [{ label: titles.join(', '), value, year: date.getFullYear() }]
				: [];
		});
	});

	// Create a reactive state for the container's width
	let currentWidth = $state(0);

	const chart: Attachment = (element) => {
		// Use a ResizeObserver to measure the container and trigger a render
		const observer = new ResizeObserver((entries) => {
			for (let entry of entries) {
				// Get the actual inner width of the container div
				const { width } = entry.contentRect;

				// Only render if we have a valid width
				if (width > 0) {
					currentWidth = width;
				}
			}
		});

		// Start observing the element this action is attached to
		observer.observe(element);

		// Svelte tracks dependencies here. Because we read currentWidth, allData,
		// colorDomain, etc., any change to them will trigger a re-render.
		if (currentWidth === 0) return;

		// Use innerHTML = '' instead of firstChild.remove()
		// because we are going to append TWO elements now (plot + legend).
		element.innerHTML = '';

		const plot = Plot.plot({
			marks: [
				Plot.areaY(actualValuesWithEffects, {
					x: 'date',
					y: 'value',
					fill: 'status',
					interval: 'year',
					order:
						effects[0]?.value < 0
							? [
									'trend',
									status.enum['status.idea'],
									status.enum['status.in_planning'],
									status.enum['status.in_implementation'],
									status.enum['status.done']
								]
							: [
									'trend',
									status.enum['status.done'],
									status.enum['status.in_implementation'],
									status.enum['status.in_planning'],
									status.enum['status.idea']
								],
					reduce: 'sum'
				}),
				Plot.lineY(objectives, {
					x: 'date',
					y: 'value',
					interval: 'year',
					sort: 'date',
					stroke: 'var(--indicator-color-objective)',
					strokeDasharray: '8 4'
				})
			],
			width: currentWidth,
			height: (currentWidth * 400) / 640, // Maintain the 640:400 aspect ratio
			grid: true,
			y: { label: $_(unit), tickFormat: (d) => $number(d) },
			color: {
				domain: colorDomain,
				range: colorRange
			},
			style: {
				fontSize: '0.75rem'
			}
		});

		element.append(plot);

		if (showLegend) {
			const legend = Plot.legend({
				color: {
					legend: true,
					domain: colorDomain,
					range: colorRange,
					tickFormat: (d) => $_(d)
				},
				style: {
					fontSize: '0.75rem'
				},
				swatchHeight: 3
			});

			element.append(legend);
		}

		// Return a destroy method for cleanup
		return () => {
			observer.disconnect();
		};
	};
</script>

{#if actualDataContainer.length > 0 || effects.length > 0 || objectives.length > 0}
	<figure>
		{#if isColumnChart}
			<IndicatorColumnChart
				colorDomain={columnOrder}
				colorRange={columnColors}
				data={columnData}
				labels={columnLabels}
				layout="stack"
				targets={objectiveTargets}
				tooltipValue={({ key, value, year }) =>
					key === 'trend' ? (actualValuesByYear.get(year) ?? value) : value}
				{unit}
			/>

			{#if showLegend}
				<IndicatorChartLegend
					items={[
						...columnOrder
							.filter((key) => columnData.some((d) => d.key === key))
							.map((key) => ({
								color: columnColors[columnOrder.indexOf(key)],
								label: columnLabels.get(key) ?? key,
								shape: 'rect' as const
							})),
						...(objectiveTargets.length > 0
							? [
									{
										color: 'var(--indicator-color-objective)',
										dashed: true,
										label: $_('objective'),
										shape: 'line' as const
									}
								]
							: [])
					]}
				/>
			{/if}
		{:else}
			<div role="img" {@attach chart}></div>
		{/if}

		{#if actualDataContainer[0]?.payload.source}
			<figcaption>{$_('indicator.source')}: {actualDataContainer[0].payload.source}</figcaption>
		{/if}
	</figure>
{/if}

<style>
	figure {
		background-color: white;
		border-radius: 8px;
	}
</style>
