<script lang="ts">
	import * as Plot from '@observablehq/plot';
	import { _ } from 'svelte-i18n';
	import {
		findAncestors,
		findOverallObjective,
		findParentObjectives,
		hasHistoricalValues,
		isContainerWithEffect,
		isEffectContainer,
		isMeasureContainer,
		predicates,
		status
	} from '$lib/models';
	import type { Container, IndicatorContainer } from '$lib/models';

	export let container: IndicatorContainer;
	export let relatedContainers: Container[] = [];
	export let showEffects = false;
	export let showObjectives = false;

	let div: HTMLElement;

	let effects = [] as Array<{ Year: number; Value: number; Status: string }>;
	let effectsMinYear = 0;
	let effectsByStatus: Map<string, Array<{ Year: number; Value: number }>>;
	let overallObjective = [] as Array<{ Year: number; Value: number }>;
	let overallObjectiveMinYear = 0;
	let objectives = [] as Array<{ Year: number; Value: number }>;
	let objectivesMinYear = 0;
	let ideasByYear: Map<number, number>;
	let inPlanningByYear: Map<number, number>;
	let inImplementationByYear: Map<number, number>;
	let doneByYear: Map<number, number>;

	$: historicalValuesByYear = new Map(container.payload.historicalValues);

	$: if (showObjectives) {
		overallObjective =
			findOverallObjective(container, relatedContainers)?.payload.wantedValues.map(
				([Year, Value]) => ({ Year, Value: (historicalValuesByYear.get(Year) ?? 0) + Value })
			) ?? [];
		overallObjectiveMinYear = Math.min(...overallObjective.map(({ Year }) => Year));
		overallObjective = [
			{
				Year: overallObjectiveMinYear - 1,
				Value: historicalValuesByYear.get(overallObjectiveMinYear - 1) ?? 0
			},
			...overallObjective
		];

		objectives = findParentObjectives(relatedContainers)
			.flatMap(({ payload }) => payload.wantedValues)
			.map(([year, value]) => ({ Year: year, Value: value }))
			.reduce(
				(accumulator, currentValue) => {
					const groupIndex = accumulator.findIndex(({ Year }) => currentValue.Year == Year);
					return groupIndex > -1
						? [
								...accumulator.slice(0, groupIndex),
								{
									Year: currentValue.Year,
									Value: currentValue.Value + accumulator[groupIndex].Value
								},
								...accumulator.slice(groupIndex + 1)
							]
						: [
								...accumulator,
								{
									Year: currentValue.Year,
									Value: currentValue.Value
								}
							];
				},
				[] as Array<{ Year: number; Value: number }>
			)
			.map(({ Year, Value }) => ({ Year, Value: (historicalValuesByYear.get(Year) ?? 0) + Value }));

		objectivesMinYear = Math.min(...objectives.map(({ Year }) => Year));

		objectives = [
			{
				Year: objectivesMinYear - 1,
				Value: historicalValuesByYear.get(objectivesMinYear - 1) ?? 0
			},
			...objectives
		];
	}

	$: {
		if (showEffects) {
			const effectContainers = relatedContainers.filter(isEffectContainer);
			const measureContainers = relatedContainers.filter(isContainerWithEffect);

			effects = effectContainers
				.map((c) => {
					const measure = findAncestors(c, relatedContainers, predicates.enum['is-part-of']).find(
						isContainerWithEffect
					);
					return {
						indicator: container.guid,
						values: c.payload.plannedValues
							.map(([year, value], index) => ({
								Year: year,
								Value:
									measure?.payload.status == status.enum['status.in_implementation'] &&
									c.payload.achievedValues[index]
										? value - c.payload.achievedValues[index][1]
										: value,
								Status: measure?.payload.status as string
							}))
							.concat(
								c.payload.achievedValues.map(([year, value]) => ({
									Year: year,
									Value: value,
									Status: status.enum['status.done'] as string
								}))
							)
					};
				})
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

			ideasByYear = new Map(
				effects
					.filter(({ Status }) => Status == status.enum['status.idea'])
					.map(({ Year, Value }) => [Year, Value])
			);

			inPlanningByYear = new Map(
				effects
					.filter(({ Status }) => Status == status.enum['status.in_planning'])
					.map(({ Year, Value }) => [Year, Value])
			);

			inImplementationByYear = new Map(
				effects
					.filter(({ Status }) => Status == status.enum['status.in_implementation'])
					.map(({ Year, Value }) => [Year, Value])
			);

			doneByYear = new Map(
				effects
					.filter(({ Status }) => Status == status.enum['status.done'])
					.map(({ Year, Value }) => [Year, Value])
			);

			const baseline = hasHistoricalValues(container)
				? container.payload.historicalValues
				: Array.from(
						new Map(
							effects
								.map(({ Year }) => Year)
								.sort()
								.map((year) => [year, 0])
						).entries()
					);

			effectsByStatus = new Map([
				[
					status.enum['status.idea'],
					[
						{
							Year: effectsMinYear - 1,
							Value: historicalValuesByYear.get(effectsMinYear - 1) ?? 0
						},
						...baseline
							.filter(([year]) => year >= effectsMinYear)
							.map(([year, value]) => {
								return {
									Year: year,
									Value:
										(doneByYear.get(year) ?? 0) +
										(inImplementationByYear.get(year) ?? 0) +
										(inPlanningByYear.get(year) ?? 0) +
										(ideasByYear.get(year) ?? 0) +
										value
								};
							})
					]
				],
				[
					status.enum['status.in_planning'],
					[
						{
							Year: effectsMinYear - 1,
							Value: historicalValuesByYear.get(effectsMinYear - 1) ?? 0
						},
						...baseline
							.filter(([year]) => year >= effectsMinYear)
							.map(([year, value]) => {
								return {
									Year: year,
									Value:
										(doneByYear.get(year) ?? 0) +
										(inImplementationByYear.get(year) ?? 0) +
										(inPlanningByYear.get(year) ?? 0) +
										value
								};
							})
					]
				],
				[
					status.enum['status.in_implementation'],
					[
						{
							Year: effectsMinYear - 1,
							Value: historicalValuesByYear.get(effectsMinYear - 1) ?? 0
						},
						...baseline
							.filter(([year]) => year >= effectsMinYear)
							.map(([year, value]) => {
								return {
									Year: year,
									Value:
										(doneByYear.get(year) ?? 0) + (inImplementationByYear.get(year) ?? 0) + value
								};
							})
					]
				],
				[
					status.enum['status.done'],
					[
						{
							Year: effectsMinYear - 1,
							Value: historicalValuesByYear.get(effectsMinYear - 1) ?? 0
						},
						...baseline
							.filter(([year]) => year >= effectsMinYear)
							.map(([year, value]) => {
								return {
									Year: year,
									Value: (doneByYear.get(year) ?? 0) + value
								};
							})
					]
				]
			]);
		}
	}

	$: {
		let unit = $_(container.payload.unit);
		let effectColorByStatus = new Map<string, string>([
			[status.enum['status.idea'], '#ca1d61'],
			[status.enum['status.in_planning'], '#f18c5f'],
			[status.enum['status.in_implementation'], '#fccd6c'],
			[status.enum['status.done'], '#6edaa6']
		]);

		div?.firstChild?.remove();
		div?.append(
			Plot.plot({
				marks: [
					Plot.areaY(
						container.payload.historicalValues.map(([key, value]) => ({ Year: key, Value: value })),
						{ x: 'Year', y: 'Value', fill: '#21A5ED', fillOpacity: 0.15, curve: 'linear' }
					),
					...(showEffects && effects.length > 0
						? Array.from(effectsByStatus.entries()).flatMap(([s, d], index) => [
								Plot.lineY(d, {
									x: 'Year',
									y: 'Value',
									stroke: effectColorByStatus.get(s),
									strokeWidth: 1
								}),
								Plot.dot(
									d,
									Plot.pointerX({ x: 'Year', y: 'Value', stroke: effectColorByStatus.get(s) })
								),
								Plot.text(
									d,
									Plot.pointerX({
										px: 'Year',
										py: 'Value',
										dx: 10,
										dy: (index + 3) * 12 - 17,
										frameAnchor: 'top-left',
										fill: effectColorByStatus.get(s),
										text: (d) => {
											switch (s) {
												case status.enum['status.idea']:
													return $_('indicator.tip.idea', {
														values: { year: d.Year, value: ideasByYear.get(d.Year) ?? 0, unit }
													});
												case status.enum['status.in_planning']:
													return $_('indicator.tip.in_planning', {
														values: { year: d.Year, value: inPlanningByYear.get(d.Year) ?? 0, unit }
													});
												case status.enum['status.in_implementation']:
													return $_('indicator.tip.in_implementation', {
														values: {
															year: d.Year,
															value: inImplementationByYear.get(d.Year) ?? 0,
															unit
														}
													});
												case status.enum['status.done']:
													return $_('indicator.tip.done', {
														values: { year: d.Year, value: doneByYear.get(d.Year) ?? 0, unit }
													});
											}
										}
									})
								)
							])
						: []),
					...(showObjectives && objectives.length > 0
						? [
								Plot.lineY(objectives, {
									x: 'Year',
									y: 'Value',
									stroke: '#21a5ed'
								}),
								Plot.dot(
									objectives,
									Plot.pointerX({
										x: 'Year',
										y: 'Value',
										stroke: '#21a5ed'
									})
								),
								Plot.text(
									objectives,
									Plot.pointerX({
										px: 'Year',
										py: 'Value',
										dx: 10,
										dy: 7,
										frameAnchor: 'top-left',
										fill: '#21a5ed',
										text: (d) =>
											$_('indicator.tip.objectives', {
												values: { year: d.Year, value: d.Value, unit }
											})
									})
								)
							]
						: []),
					...(showObjectives && overallObjective.length > 0
						? [
								Plot.lineY(overallObjective, { x: 'Year', y: 'Value', stroke: '#1f2a37' }),
								Plot.dot(
									overallObjective,
									Plot.pointerX({
										x: 'Year',
										y: 'Value',
										stroke: '#1f2a37'
									})
								),
								Plot.text(
									overallObjective,
									Plot.pointerX({
										px: 'Year',
										py: 'Value',
										dx: 10,
										dy: -5,
										frameAnchor: 'top-left',
										fill: '#1f2a37',
										text: (d) =>
											$_('indicator.tip.overall_objective', {
												values: { year: d.Year, value: d.Value, unit }
											})
									})
								)
							]
						: []),
					Plot.lineY(
						container.payload.historicalValues.map(([key, value]) => ({ Year: key, Value: value })),
						{ x: 'Year', y: 'Value' }
					),
					Plot.dot(
						container.payload.historicalValues.map(([key, value]) => ({ Year: key, Value: value })),
						Plot.pointerX({ x: 'Year', y: 'Value' })
					),
					Plot.text(
						container.payload.historicalValues.map(([key, value]) => ({ Year: key, Value: value })),
						Plot.pointerX({
							px: 'Year',
							py: 'Value',
							dx: 10,
							dy: -17,
							frameAnchor: 'top-left',
							text: (d) =>
								$_('indicator.tip.historical_values', {
									values: { year: d.Year, value: d.Value, unit }
								})
						})
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
