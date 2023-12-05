<script lang="ts">
	import * as Plot from '@observablehq/plot';
	import { _ } from 'svelte-i18n';
	import { isMeasureContainer, payloadTypes, predicates, status } from '$lib/models';
	import type {
		Container,
		IndicatorContainer,
		IndicatorObjective,
		MeasureContainer
	} from '$lib/models';

	export let container: IndicatorContainer;
	export let relatedContainers: Container[] = [];
	export let showEffects = false;
	export let showObjectives = false;

	let div: HTMLElement;

	let effects = [] as Array<{ Year: number; Value: number; Status: string }>;
	let effectsMinYear = 0;
	let objectives = [] as Array<{ Year: number; Value: number }>;
	let objectivesMinYear = 0;
	let maxYear =
		container.payload.historicalValues[container.payload.historicalValues.length - 1][0];

	let effectColorByStatus = new Map<string, string>([
		['indicator.historical_values', 'transparent'],
		[status.enum['status.idea'], 'red'],
		[status.enum['status.in_planning'], 'orange'],
		[status.enum['status.in_implementation'], 'yellow'],
		[status.enum['status.done'], 'green']
	]);

	if (showObjectives) {
		const containersWithObjectives = relatedContainers
			.filter(({ payload }) => 'objective' in payload)
			.filter(
				({ payload, relation, revision }) =>
					payload.type == payloadTypes.enum.model ||
					relation.findIndex(
						({ predicate, subject }) =>
							predicate == predicates.enum['is-part-of'] && subject == revision
					) == -1
			) as Array<Container & { payload: { objective: IndicatorObjective[] } }>;

		objectives = containersWithObjectives
			.map(({ payload }) => payload.objective)
			.flat()
			.filter(({ indicator }) => indicator == container.guid)
			.map(({ wantedValues }) => wantedValues)
			.flat()
			.map(([year, value]) => ({ Year: year, Value: value }));
		objectivesMinYear = Math.min(...objectives.map(({ Year }) => Year));
	}

	if (showEffects) {
		const containersWithEffects = relatedContainers.filter((c) =>
			isMeasureContainer(c)
		) as MeasureContainer[];

		effects = containersWithEffects
			.map(({ payload }) =>
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
			.flat()
			.filter(({ indicator }) => indicator == container.guid)
			.map(({ values }) => values)
			.flat();

		effectsMinYear = Math.min(...objectives.map(({ Year }) => Year));
	}

	$: {
		let quantity = $_(`${container.payload.quantity}.label`);
		let unit = $_(container.payload.unit);

		div?.firstChild?.remove();
		div?.append(
			Plot.plot({
				marks: [
					Plot.areaY(
						container.payload.historicalValues.map(([key, value]) => ({ Year: key, Value: value })),
						{ x: 'Year', y: 'Value', fillOpacity: 0.1, curve: 'linear' }
					),
					...(showEffects && effects.length > 0
						? [
								Plot.areaY(
									container.payload.historicalValues
										.filter(([year]) => year >= effectsMinYear)
										.map(([year, value]) => ({
											Year: year,
											Value: value,
											Status: $_('indicator.historical_values')
										}))
										.concat(effects.filter(({ Year }) => Year <= maxYear)),
									Plot.groupX(
										{ y: 'sum' },
										{
											x: 'Year',
											y: 'Value',
											fill: (d: { Status: string }) => effectColorByStatus.get(d.Status),
											fillOpacity: 0.2,
											order: ['transparent', 'green', 'yellow', 'orange', 'red']
										}
									)
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
										.concat(objectives.filter(({ Year }) => Year <= maxYear)),
									Plot.groupX(
										{
											y: 'sum'
										},
										{
											x: 'Year',
											y: 'Value',
											stroke: 'red',
											strokeWidth: 1
										}
									)
								)
						  ]
						: []),
					Plot.ruleX([new Date().getFullYear()])
				],
				x: { label: null, tickFormat: '' },
				y: { label: `${quantity} (${unit})` }
			})
		);
	}
</script>

<figure>
	<div bind:this={div} role="img"></div>
</figure>
