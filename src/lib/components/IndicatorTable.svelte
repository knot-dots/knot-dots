<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { isContainerWithEffect, status } from '$lib/models';
	import type {
		Container,
		ContainerWithEffect,
		ContainerWithObjective,
		IndicatorContainer
	} from '$lib/models';

	export let container: IndicatorContainer;
	export let containersWithObjectives: ContainerWithObjective[] = [];
	export let relatedContainers: Container[] = [];
	export let showEffects = false;
	export let showObjectives = false;

	let effects = [] as Array<{ Year: number; Value: number; Status: string }>;
	let effectsMinYear = 0;
	let objectives = [] as Array<{ Year: number; Value: number }>;
	let objectivesMinYear = 0;
	let maxYear =
		container.payload.historicalValues.length > 0
			? container.payload.historicalValues[container.payload.historicalValues.length - 1][0]
			: 0;
	let objectivesByYear: Map<number, number>;
	let ideasByYear: Map<number, number>;
	let inPlanningByYear: Map<number, number>;
	let inImplementationByYear: Map<number, number>;
	let doneByYear: Map<number, number>;

	const containersWithEffects = relatedContainers.filter((c) =>
		isContainerWithEffect(c)
	) as ContainerWithEffect[];

	$: historicalValuesByYear = new Map(container.payload.historicalValues);

	$: {
		objectives = containersWithObjectives
			.flatMap(({ payload }) => payload.objective)
			.filter(({ indicator }) => indicator == container.guid)
			.flatMap(({ wantedValues }) => wantedValues)
			.map(([year, value]) => ({ Year: year, Value: value }))
			.filter(({ Year }) => Year <= maxYear)
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

		objectivesByYear = new Map(objectives.map(({ Year, Value }) => [Year, Value]));
	}

	$: {
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
	}

	$: years = Array.from(
		{ length: maxYear - Math.min(effectsMinYear, objectivesMinYear) + 2 },
		(value, index) => Math.min(effectsMinYear, objectivesMinYear) - 1 + index
	);
</script>

<div>
	<table>
		<thead>
			<th></th>
			{#each years as year}
				<th>{year}</th>
			{/each}
		</thead>

		<tbody>
			<tr class="historical-values">
				<th scope="row">{$_('indicator.table.historical_values')}</th>
				{#each years as year}
					<td>{historicalValuesByYear.get(year) ?? ''}</td>
				{/each}
			</tr>
		</tbody>

		{#if showObjectives}
			<tbody>
				<tr class="objective-total">
					<th scope="row">{$_('indicator.table.objectives')}</th>
					{#each years as year}
						<td>{objectivesByYear.get(year) ?? 0}</td>
					{/each}
				</tr>
				{#each containersWithObjectives as containerWithObjective}
					{@const valuesByYear = new Map(
						containerWithObjective.payload.objective
							.filter(({ indicator }) => indicator == container.guid)
							.flatMap(({ wantedValues }) => wantedValues)
					)}
					<tr class="objective">
						<th scope="row">{container.payload.title}</th>
						{#each years as year}
							<td>{valuesByYear.get(year) ?? 0}</td>
						{/each}
					</tr>
				{/each}
			</tbody>
		{/if}

		{#if showEffects}
			<tbody>
				<tr>
					<th colspan={years.length + 1}>{$_('indicator.table.implementation')}</th>
				</tr>

				<tr class="done-total">
					<th scope="row">{$_('indicator.table.done')}</th>
					{#each years as year}
						<td>{doneByYear.get(year) ?? 0}</td>
					{/each}
				</tr>

				{#each containersWithEffects.filter(({ payload }) => payload.status === status.enum['status.done']) as containerWithEffect}
					{@const valuesByYear = new Map(
						containerWithEffect.payload.effect
							.filter(({ indicator }) => indicator == container.guid)
							.flatMap(({ achievedValues }) => achievedValues)
					)}
					<tr class="done">
						<th scope="row">{containerWithEffect.payload.title}</th>
						{#each years as year}
							<td>{valuesByYear.get(year) ?? 0}</td>
						{/each}
					</tr>
				{/each}

				<tr class="in-progress-total">
					<th scope="row">{$_('indicator.table.in_progress')}</th>
					{#each years as year}
						<td>{inImplementationByYear.get(year) ?? 0}</td>
					{/each}
				</tr>
				{#each containersWithEffects.filter(({ payload }) => payload.status === status.enum['status.in_implementation']) as containerWithEffect}
					{@const valuesByYear = new Map(
						containerWithEffect.payload.effect
							.filter(({ indicator }) => indicator == container.guid)
							.flatMap(({ plannedValues }) => plannedValues)
					)}
					<tr class="in-progress">
						<th scope="row">{containerWithEffect.payload.title}</th>
						{#each years as year}
							<td>{valuesByYear.get(year) ?? 0}</td>
						{/each}
					</tr>
				{/each}

				<tr class="in-planning-total">
					<th scope="row">{$_('indicator.table.in_planning')}</th>
					{#each years as year}
						<td>{inPlanningByYear.get(year) ?? 0}</td>
					{/each}
				</tr>
				{#each containersWithEffects.filter(({ payload }) => payload.status === status.enum['status.in_planning']) as containerWithEffect}
					{@const valuesByYear = new Map(
						containerWithEffect.payload.effect
							.filter(({ indicator }) => indicator == container.guid)
							.flatMap(({ plannedValues }) => plannedValues)
					)}
					<tr class="in-planning">
						<th scope="row">{containerWithEffect.payload.title}</th>
						{#each years as year}
							<td>{valuesByYear.get(year) ?? 0}</td>
						{/each}
					</tr>
				{/each}

				<tr class="idea-total">
					<th scope="row">{$_('indicator.table.idea')}</th>
					{#each years as year}
						<td>{ideasByYear.get(year) ?? 0}</td>
					{/each}
				</tr>
				{#each containersWithEffects.filter(({ payload }) => payload.status === status.enum['status.idea']) as containerWithEffect}
					{@const valuesByYear = new Map(
						containerWithEffect.payload.effect
							.filter(({ indicator }) => indicator == container.guid)
							.flatMap(({ plannedValues }) => plannedValues)
					)}
					<tr class="idea">
						<th scope="row">{containerWithEffect.payload.title}</th>
						{#each years as year}
							<td>{valuesByYear.get(year) ?? 0}</td>
						{/each}
					</tr>
				{/each}
			</tbody>
		{/if}
	</table>
</div>

<style>
	div {
		overflow-x: scroll;
	}

	thead {
		background-color: var(--color-gray-200);
	}

	td {
		text-align: right;
	}

	th[scope='row'] {
		font-weight: normal;
	}

	tr {
		background-color: var(--color-gray-050);
		border-bottom: solid 1px white;
	}

	.done-total {
		background-color: var(--color-green);
	}

	.done {
		background-color: var(--color-green-background);
	}

	.historical-values {
		background-color: var(--color-gray-100);
	}

	.idea-total {
		background-color: var(--color-red);
	}

	.idea {
		background-color: var(--color-red-background);
	}

	.in-planning-total {
		background-color: var(--color-yellow);
	}

	.in-planning {
		background-color: var(--color-yellow-background);
	}

	.in-progress-total {
		background-color: var(--color-orange);
	}

	.in-progress {
		background-color: var(--color-orange-background);
	}

	.objective-total {
		background-color: var(--color-blue);
	}

	.objective {
		background-color: var(--color-blue-background);
	}
</style>
