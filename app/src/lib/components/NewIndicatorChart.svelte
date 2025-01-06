<script lang="ts">
	import * as Plot from '@observablehq/plot';
	import { _, number } from 'svelte-i18n';
	import {
		findAncestors,
		findLeafObjectives,
		isContainerWithEffect,
		isEffectContainer,
		isObjectiveContainer,
		predicates,
		status
	} from '$lib/models';
	import type { Container, IndicatorContainer } from '$lib/models';

	export let container: IndicatorContainer;
	export let relatedContainers: Container[] = [];
	export let showEffects = false;
	export let showObjectives = false;
	export let showLegend = false;

	let div: HTMLElement;

	$: {
		const unit = $_(container.payload.unit);

		const historicalValuesByYear = new Map(container.payload.historicalValues);
		const trend = container.payload.historicalValues.map(([key, value]) => ({
			date: new Date(key, 0),
			value
		}));

		let objectives = [] as Array<{ date: Date; value: number }>;

		if (showObjectives) {
			objectives = findLeafObjectives(relatedContainers.filter(isObjectiveContainer))
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

		let effects = [] as Array<{ date: Date; value: number; status: string }>;

		if (showEffects) {
			effects = relatedContainers.filter(isEffectContainer).flatMap((c) => {
				const measure = findAncestors(c, relatedContainers, predicates.enum['is-part-of']).find(
					isContainerWithEffect
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

		const trendWithEffects =
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
				: [...effects, ...trend.map((t) => ({ ...t, status: 'trend' }))];

		div?.firstChild?.remove();
		div?.append(
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
						: []),
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
				y: { label: $_(unit), tickFormat: (d) => $number(d) }
			})
		);
	}
</script>

<figure>
	{#if $$slots.caption}
		<figcaption><slot name="caption" /></figcaption>
	{/if}
	<div bind:this={div} role="img"></div>
</figure>

<style>
	figcaption {
		font-size: inherit;
		margin-bottom: 0.875rem;
	}
</style>
