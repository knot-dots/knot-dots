<script lang="ts">
	import * as Plot from '@observablehq/plot';
	import type { Attachment } from 'svelte/attachments';
	import { _, number } from 'svelte-i18n';
	import { indicatorActualData, indicatorActualDataContainers } from '$lib/indicatorActualData';
	import { indicatorChartOptions, textWidthIn, valueExtent } from '$lib/indicatorChart';
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
		container: Container<IndicatorPayload>;
		relatedContainers?: Container[];
		showLegend?: boolean;
	}

	let { container, relatedContainers = [], showLegend = false }: Props = $props();

	let unit = $derived($_(container.payload.unit));

	let actualDataContainer = $derived(
		indicatorActualDataContainers(container.guid, relatedContainers)
	);

	let actualValues = $derived(
		indicatorActualData(container.guid, relatedContainers).map(([year, value]) => ({
			value,
			year
		}))
	);

	let actualValuesByYear = $derived(new Map(actualValues.map(({ value, year }) => [year, value])));

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
				value: (actualValuesByYear.get(year) ?? 0) + value,
				year
			}));

		const objectivesMinYear = Math.min(...objectives.map(({ year }) => year));

		if (objectives.length > 0) {
			objectives = [
				{
					value: actualValuesByYear.get(objectivesMinYear - 1) ?? 0,
					year: objectivesMinYear - 1
				},
				...objectives
			];
		}

		return objectives.toSorted((a, b) => a.year - b.year);
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
					year,
					value: value,
					status: status.enum['status.done'],
					title: c.payload.title,
					guid: c.guid
				}));
			} else if (measure.payload.status == status.enum['status.in_implementation']) {
				return [
					...c.payload.plannedValues.map(([year, value], index) => ({
						year,
						value: c.payload.achievedValues[index]
							? value - c.payload.achievedValues[index][1]
							: value,
						status: measure.payload.status,
						title: c.payload.title,
						guid: c.guid
					})),
					...c.payload.achievedValues.map(([year, value]) => ({
						year,
						value: value,
						status: status.enum['status.done'],
						title: c.payload.title,
						guid: c.guid
					}))
				];
			} else if (measure.payload.status == status.enum['status.rejected']) {
				return c.payload.plannedValues.map(([year]) => ({
					year,
					value: 0,
					status: measure.payload.status,
					title: c.payload.title,
					guid: c.guid
				}));
			} else {
				return c.payload.plannedValues.map(([year, value]) => ({
					year,
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
					...effects.map(({ status, value, year }) => ({ status, value: Math.abs(value), year })),
					...actualValues.map(({ value, year }) => ({
						value:
							value -
							Math.abs(
								effects
									.filter((e) => e.year == year)
									.reduce((accumulator, currentValue) => accumulator + currentValue.value, 0)
							),
						status: 'trend',
						year
					}))
				]
			: [...effects, ...actualValues.map((t) => ({ ...t, status: 'trend' }))]
	);

	// The values of each status summed up per year, which the areas stack
	let areas = $derived.by(() => {
		const sums = new Map<string, { status: string; value: number; year: number }>();
		for (const { status, value, year } of actualValuesWithEffects) {
			const key = `${year} ${status}`;
			sums.set(key, { status, value: (sums.get(key)?.value ?? 0) + value, year });
		}
		return [...sums.values()].toSorted((a, b) => a.year - b.year);
	});

	// The y axis covers zero, the stacks above and below it, and the objectives.
	let extent = $derived.by(() => {
		const above = new Map<number, number>();
		const below = new Map<number, number>();
		for (const { value, year } of areas) {
			const stack = value < 0 ? below : above;
			stack.set(year, (stack.get(year) ?? 0) + value);
		}
		return valueExtent([
			0,
			...above.values(),
			...below.values(),
			...objectives.map((o) => o.value)
		]);
	});

	let width = $state(0);

	// Axes and grid as in the other charts of indicators, 640:400
	const chart: Attachment<HTMLElement> = (element) => {
		if (width === 0 || areas.length + objectives.length === 0) {
			return;
		}

		const options = indicatorChartOptions({
			extent,
			format: (value) => $number(value),
			height: (width * 400) / 640,
			textWidth: textWidthIn(element),
			width,
			years: [...areas, ...objectives].map(({ year }) => year)
		});

		const plot = Plot.plot({
			...options,
			color: {
				domain: colorDomain,
				range: colorRange
			},
			marks: [
				...options.marks,
				Plot.areaY(areas, {
					x: 'year',
					y: 'value',
					fill: 'status',
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
								]
				}),
				Plot.lineY(objectives, {
					x: 'year',
					y: 'value',
					stroke: 'var(--indicator-color-objective)',
					strokeDasharray: '8 4'
				})
			]
		});

		element.replaceChildren(
			plot,
			...(showLegend
				? [
						Plot.legend({
							color: {
								legend: true,
								domain: colorDomain,
								range: colorRange,
								tickFormat: (d) => $_(d)
							},
							style: {
								fontFamily: 'inherit',
								fontSize: '0.75rem'
							},
							swatchHeight: 3
						})
					]
				: [])
		);
	};
</script>

{#if actualDataContainer.length > 0 || effects.length > 0 || objectives.length > 0}
	<figure class="chart">
		<span class="unit">{unit}</span>
		<div bind:clientWidth={width} class="plot" role="img" {@attach chart}></div>

		{#if actualDataContainer[0]?.payload.source}
			<figcaption>{$_('indicator.source')}: {actualDataContainer[0].payload.source}</figcaption>
		{/if}
	</figure>
{/if}

<style>
	.unit,
	.plot {
		color: var(--chart-axis-text);
		font-size: 0.75rem;
		line-height: 1.5;
	}
</style>
