<script lang="ts">
	import * as Plot from '@observablehq/plot';
	import type { Attachment } from 'svelte/attachments';
	import { _, number } from 'svelte-i18n';
	import {
		type Container,
		findAncestors,
		findLeafObjectives,
		type IndicatorTemplateContainer,
		isActualDataContainer,
		isContainerWithEffect,
		isEffectContainer,
		isObjectiveContainer,
		predicates,
		status
	} from '$lib/models';

	interface Props {
		container: IndicatorTemplateContainer;
		relatedContainers?: Container[];
		showLegend?: boolean;
	}

	let { container, relatedContainers = [], showLegend = false }: Props = $props();

	let unit = $derived($_(container.payload.unit));

	let actualDataContainer = $derived(
		relatedContainers
			.filter(isActualDataContainer)
			.filter(({ payload }) => payload.indicator === container.guid)
			.toSorted((a, b) => (a.payload.source ? (b.payload.source ? 0 : -1) : 1))
	);

	let actualValues = $derived(
		actualDataContainer[0]?.payload.values.map(([key, value]) => ({
			date: new Date(key, 0),
			value: actualDataContainer[1]?.payload.values.find(([k]) => k == key)?.at(1) ?? value
		})) ?? []
	);

	let actualValuesByYear = $derived(
		new Map(actualValues.map(({ date, value }) => [date.getFullYear(), value]))
	);

	const colorDomain = [
		status.enum['status.idea'],
		status.enum['status.in_planning'],
		status.enum['status.in_implementation'],
		status.enum['status.done'],
		'trend'
	];

	const colorRange = [
		'var(--indicator-color-idea)',
		'var(--indicator-color-in-planning)',
		'var(--indicator-color-in-implementation)',
		'var(--indicator-color-done)',
		'var(--indicator-color-trend-area)',
		'var(--indicator-color-trend-line)'
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
			if (measure?.payload.status == status.enum['status.done']) {
				return c.payload.achievedValues.map(([year, value]) => ({
					date: new Date(year, 0),
					value: value,
					status: status.enum['status.done'] as string,
					title: c.payload.title,
					guid: c.guid
				}));
			} else if (measure?.payload.status == status.enum['status.in_implementation']) {
				return [
					...c.payload.plannedValues.map(([year, value], index) => ({
						date: new Date(year, 0),
						value: c.payload.achievedValues[index]
							? value - c.payload.achievedValues[index][1]
							: value,
						status: measure?.payload.status as string,
						title: c.payload.title,
						guid: c.guid
					})),
					...c.payload.achievedValues.map(([year, value]) => ({
						date: new Date(year, 0),
						value: value,
						status: status.enum['status.done'] as string,
						title: c.payload.title,
						guid: c.guid
					}))
				];
			} else if (measure?.payload.status == status.enum['status.rejected']) {
				return c.payload.plannedValues.map(([year]) => ({
					date: new Date(year, 0),
					value: 0,
					status: measure?.payload.status as string,
					title: c.payload.title,
					guid: c.guid
				}));
			} else {
				return c.payload.plannedValues.map(([year, value]) => ({
					date: new Date(year, 0),
					value: value,
					status: measure?.payload.status as string,
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
					stroke: '#21a5ed',
					strokeDasharray: '4 8'
				}),
				Plot.lineY(actualValues, {
					x: 'date',
					y: 'value',
					stroke: 'municipality',
					strokeWidth: 3,
					strokeLinecap: 'round',
					interval: 'year'
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
		<div role="img" {@attach chart}></div>

		{#if actualDataContainer[0]?.payload.source}
			<figcaption>{$_('indicator.source')}: {actualDataContainer[0].payload.source}</figcaption>
		{/if}
	</figure>
{/if}
