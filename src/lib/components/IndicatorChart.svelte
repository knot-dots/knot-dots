<script lang="ts">
	import * as Plot from '@observablehq/plot';
	import { _ } from 'svelte-i18n';
	import { isMeasureContainer, status } from '$lib/models';
	import type {
		Container,
		ContainerWithObjective,
		IndicatorContainer,
		MeasureContainer
	} from '$lib/models';

	export let container: IndicatorContainer;
	export let containersWithObjectives: ContainerWithObjective[] = [];
	export let relatedContainers: Container[] = [];
	export let showEffects = false;
	export let showObjectives = false;

	let div: HTMLElement;

	let effects = [] as Array<{ Year: number; Value: number; Status: string }>;
	let effectsMinYear = 0;
	let effectColorByStatus = new Map<string, string>([
		['offset', 'transparent'],
		[status.enum['status.idea'], '#f7d8e3'],
		[status.enum['status.in_planning'], '#fdeae1'],
		[status.enum['status.in_implementation'], '#fff6e4'],
		[status.enum['status.done'], '#e7f9ee']
	]);
	let objectives = [] as Array<{ Year: number; Value: number }>;
	let objectivesMinYear = 0;
	let maxYear =
		container.payload.historicalValues.length > 0
			? container.payload.historicalValues[container.payload.historicalValues.length - 1][0]
			: 0;

	const historicalValuesByYear = new Map(container.payload.historicalValues);

	$: if (showObjectives) {
		objectives = containersWithObjectives
			.map(({ payload }) => payload.objective)
			.flat()
			.filter(({ indicator }) => indicator == container.guid)
			.map(({ wantedValues }) => wantedValues)
			.flat()
			.map(([year, value]) => ({ Year: year, Value: value }));
		objectivesMinYear = Math.min(...objectives.map(({ Year }) => Year));
	}

	$: if (showEffects) {
		const containersWithEffects = relatedContainers.filter((c) =>
			isMeasureContainer(c)
		) as MeasureContainer[];

		effects = containersWithEffects
			.flatMap(({ payload }) =>
				payload.effect.map(({ indicator, plannedValues, achievedValues }) => ({
					indicator,
					values: plannedValues
						.map(([year, value], index) => ({
							Year: year,
							Value:
								payload.status == status.enum['status.in_implementation'] && achievedValues[index]
									? value - achievedValues[index][1]
									: value,
							Status: payload.status as string
						}))
						.concat(
							achievedValues.map(([year, value]) => ({
								Year: year,
								Value: value,
								Status: status.enum['status.done'] as string
							}))
						)
				}))
			)
			.filter(({ indicator }) => indicator == container.guid)
			.flatMap(({ values }) => values)
			.reduce(
				(accumulator, currentValue) => {
					const groupIndex = accumulator.findIndex(
						({ Status, Year }) => currentValue.Status == Status && currentValue.Year == Year
					);
					return groupIndex > 0
						? [
								...accumulator.slice(0, groupIndex),
								{
									Status: currentValue.Status,
									Year: currentValue.Year,
									Value: currentValue.Value + accumulator[groupIndex].Value
								},
								...accumulator.slice(groupIndex + 1)
						  ]
						: [
								...accumulator,
								{
									Status: currentValue.Status,
									Year: currentValue.Year,
									Value: currentValue.Value
								}
						  ];
				},
				[] as Array<{ Year: number; Value: number; Status: string }>
			);

		effectsMinYear = Math.min(...effects.map(({ Year }) => Year));
	}

	$: {
		let unit = $_(container.payload.unit);

		div?.firstChild?.remove();
		div?.append(
			Plot.plot({
				marks: [
					Plot.areaY(
						container.payload.historicalValues.map(([key, value]) => ({ Year: key, Value: value })),
						{ x: 'Year', y: 'Value', fill: '#21A5ED', fillOpacity: 0.15, curve: 'linear' }
					),
					...(showEffects && effects.length > 0
						? [
								Plot.areaY(
									container.payload.historicalValues
										.filter(([year]) => year >= effectsMinYear)
										.map(([year, value]) => {
											const effectByYear = effects.reduce((accumulator: number, currentValue) => {
												return year == currentValue.Year
													? accumulator + currentValue.Value
													: accumulator;
											}, 0);
											return {
												Year: year,
												Status: 'offset',
												Value: effects.some(({ Value }) => Value < 0) ? value + effectByYear : value
											};
										})
										.concat([
											{
												Year: effectsMinYear - 1,
												Value: 0,
												Status: status.enum['status.idea']
											},
											{
												Year: effectsMinYear - 1,
												Value: 0,
												Status: status.enum['status.in_planning']
											},
											{
												Year: effectsMinYear - 1,
												Value: 0,
												Status: status.enum['status.in_implementation']
											},
											{
												Year: effectsMinYear - 1,
												Value: 0,
												Status: status.enum['status.done']
											},
											{
												Year: effectsMinYear - 1,
												Value: historicalValuesByYear.get(effectsMinYear - 1) ?? 0,
												Status: 'offset'
											}
										])
										.concat(
											effects
												.filter(({ Year }) => Year <= maxYear)
												.map((effect) => ({ ...effect, Value: Math.abs(effect.Value) }))
										),
									{
										x: 'Year',
										y: 'Value',
										fill: (d: { Status: string }) => effectColorByStatus.get(d.Status),
										order: effects.some(({ Value }) => Value < 0)
											? [
													'transparent',
													effectColorByStatus.get(status.enum['status.idea']),
													effectColorByStatus.get(status.enum['status.in_planning']),
													effectColorByStatus.get(status.enum['status.in_implementation']),
													effectColorByStatus.get(status.enum['status.done'])
											  ]
											: [
													'transparent',
													effectColorByStatus.get(status.enum['status.done']),
													effectColorByStatus.get(status.enum['status.in_implementation']),
													effectColorByStatus.get(status.enum['status.in_planning']),
													effectColorByStatus.get(status.enum['status.idea'])
											  ]
									}
								)
						  ]
						: []),
					...(showObjectives && objectives.length > 0
						? [
								Plot.lineY(
									container.payload.historicalValues
										.filter(([year]) => year >= objectivesMinYear)
										.map(([year, value]) => ({
											Year: year,
											Value: value
										}))
										.concat(objectives.filter(({ Year }) => Year <= maxYear))
										.concat([
											{
												Year: objectivesMinYear - 1,
												Value: historicalValuesByYear.get(objectivesMinYear - 1) ?? 0
											}
										]),
									Plot.groupX(
										{
											y: 'sum'
										},
										{
											x: 'Year',
											y: 'Value',
											stroke: '#21a5ed',
											strokeWidth: 1
										}
									)
								)
						  ]
						: []),
					Plot.lineY(
						container.payload.historicalValues.map(([key, value]) => ({ Year: key, Value: value })),
						{ x: 'Year', y: 'Value' }
					),
					Plot.ruleX([new Date().getFullYear()])
				],
				x: { label: null, tickFormat: '' },
				y: { label: $_(unit) }
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
