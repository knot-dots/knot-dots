<script lang="ts">
	import * as Plot from '@observablehq/plot';
	import type { Attachment } from 'svelte/attachments';
	import { _, number } from 'svelte-i18n';
	import {
		type AnyContainer,
		findAncestors,
		findLeafObjectives,
		type IndicatorContainer,
		isContainerWithPayloadType,
		payloadTypes,
		predicates,
		status
	} from '$lib/models';

	interface Props {
		container: IndicatorContainer;
		relatedContainers?: AnyContainer[];
		showEffects?: boolean;
		showObjectives?: boolean;
		showLegend?: boolean;
	}

	let {
		container,
		relatedContainers = [],
		showEffects = false,
		showObjectives = false,
		showLegend = false
	}: Props = $props();

	let unit = $derived($_(container.payload.unit));

	let historicalValuesByYear = $derived(new Map(container.payload.historicalValues));

	let trend = $derived(
		container.payload.historicalValues.map(([key, value]) => ({
			date: new Date(key, 0),
			value
		}))
	);

	let objectives = $derived.by(() => {
		let objectives = [] as Array<{ date: Date; value: number }>;

		if (showObjectives) {
			objectives = findLeafObjectives(
				relatedContainers.filter((container) =>
					isContainerWithPayloadType(payloadTypes.enum.objective, container)
				)
			)
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
					value: (historicalValuesByYear.get(year) ?? 0) + value
				}));

			const objectivesMinYear = Math.min(...objectives.map(({ date }) => date.getFullYear()));

			objectives = [
				{
					date: new Date(objectivesMinYear - 1, 0),
					value: historicalValuesByYear.get(objectivesMinYear - 1) ?? 0
				},
				...objectives
			];
		}

		return objectives;
	});

	let effects = $derived.by(() => {
		let effects = [] as Array<{ date: Date; value: number; status: string }>;

		if (showEffects) {
			effects = relatedContainers
				.filter((container) => isContainerWithPayloadType(payloadTypes.enum.effect, container))
				.flatMap((c) => {
					const measure = findAncestors(c, relatedContainers, [
						predicates.enum['is-part-of'],
						predicates.enum['is-part-of-measure']
					]).find(
						(container) =>
							isContainerWithPayloadType(payloadTypes.enum.measure, container) ||
							isContainerWithPayloadType(payloadTypes.enum.simple_measure, container)
					);
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
				});
		}

		return effects;
	});

	let trendWithEffects = $derived(
		effects[0]?.value < 0
			? [
					...effects.map(({ date, value, status }) => ({ date, value: Math.abs(value), status })),
					...container.payload.historicalValues.map(([key, value]) => ({
						date: new Date(key, 0),
						value:
							value -
							Math.abs(
								effects
									.filter(({ date }) => date.getFullYear() == key)
									.reduce((accumulator, currentValue) => accumulator + currentValue.value, 0)
							),
						status: 'trend'
					}))
				]
			: [...effects, ...trend.map((t) => ({ ...t, status: 'trend' }))]
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

		element.innerHTML = '';
		element.append(
			Plot.plot({
				color: {
					domain: [
						status.enum['status.idea'],
						status.enum['status.in_planning'],
						status.enum['status.in_implementation'],
						status.enum['status.done'],
						'trend'
					],
					range: ['#ca1d61', '#f18c5f', '#fccd6c', '#6edaa6', 'rgb(213, 239, 252)'],
					legend: showLegend,
					tickFormat: (v) => $_(v)
				},
				marks: [
					...(showEffects && effects.length > 0
						? [
								Plot.areaY(trendWithEffects, {
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
								})
							]
						: [
								Plot.areaY(trendWithEffects, {
									x: 'date',
									y: 'value',
									fill: 'status',
									interval: 'year'
								})
							]),
					...(showObjectives && objectives.length > 0
						? [
								Plot.lineY(objectives, {
									x: 'date',
									y: 'value',
									interval: 'year',
									sort: 'date',
									stroke: '#21a5ed'
								})
							]
						: []),
					Plot.lineY(trend, { x: 'date', y: 'value', interval: 'year' }),
					Plot.ruleX([new Date()])
				],
				y: { label: $_(unit), tickFormat: (d) => $number(d) },
				width: currentWidth,
				height: (currentWidth * 400) / 640 // Maintain the 640:400 aspect ratio
			})
		);

		// Return a destroy method for cleanup
		return () => {
			observer.disconnect();
		};
	};
</script>

<figure>
	<div role="img" {@attach chart}></div>
</figure>
