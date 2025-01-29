<script lang="ts">
	import { _ } from 'svelte-i18n';
	import {
		type Container,
		type ContainerWithEffect,
		type EffectContainer,
		type IndicatorContainer,
		findParentObjectives,
		isContainerWithEffect,
		isEffectContainer,
		isObjectiveContainer,
		predicates,
		status,
		findOverallObjective,
		findAncestors
	} from '$lib/models';

	export let container: IndicatorContainer;
	export let relatedContainers: Container[] = [];
	export let showEffects = false;
	export let showObjectives = false;

	let effects = [] as Array<{ Year: number; Value: number; Status: string }>;
	let effectsMinYear = 0;
	let objectives = [] as Array<{ Year: number; Value: number }>;
	let objectivesMinYear = 0;
	let overallObjective = [] as Array<{ Year: number; Value: number }>;
	let overallObjectiveByYear: Map<number, number>;
	let overallObjectiveMinYear = 0;
	let maxYear = 0;
	let objectivesByYear: Map<number, number>;
	let ideasByYear: Map<number, number>;
	let inPlanningByYear: Map<number, number>;
	let inImplementationByYear: Map<number, number>;
	let doneByYear: Map<number, number>;

	let effectContainers = [] as EffectContainer[];
	let measureContainers = [] as ContainerWithEffect[];

	$: historicalValuesByYear = new Map(container.payload.historicalValues);

	$: {
		overallObjective =
			findOverallObjective(container, relatedContainers)?.payload.wantedValues.map(
				([Year, Value]) => ({ Year, Value: (historicalValuesByYear.get(Year) ?? 0) + Value })
			) ?? [];
		overallObjectiveMinYear = overallObjectiveMinYear
			? Math.min(...overallObjective.map(({ Year }) => Year))
			: 0;
		overallObjectiveByYear = new Map(
			[
				{
					Year: overallObjectiveMinYear - 1,
					Value: historicalValuesByYear.get(overallObjectiveMinYear - 1) ?? 0
				},
				...overallObjective
			].map(({ Year, Value }) => [Year, Value])
		);

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

		objectivesMinYear =
			objectives.length == 0 ? 0 : Math.min(...objectives.map(({ Year }) => Year));

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
		effectContainers = relatedContainers.filter(isEffectContainer);
		measureContainers = relatedContainers.filter(isContainerWithEffect);

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

		effectsMinYear = effects.length == 0 ? 0 : Math.min(...effects.map(({ Year }) => Year));

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

	$: maxYear = Math.max(
		...historicalValuesByYear.keys(),
		...overallObjectiveByYear.keys(),
		...objectivesByYear.keys(),
		...effects.map(({ Year }) => Year)
	);

	$: years = Array.from(
		{ length: maxYear - Math.max(effectsMinYear, objectivesMinYear, overallObjectiveMinYear) + 2 },
		(value, index) =>
			Math.max(effectsMinYear, objectivesMinYear, overallObjectiveMinYear) - 1 + index
	);
</script>

<div>
	<table>
		<thead>
			<tr>
				<th></th>
				{#each years as year}
					<th>{year}</th>
				{/each}
			</tr>
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
				<tr class="overall-objective">
					<th scope="row">{$_('indicator.table.overall_objective')}</th>
					{#each years as year}
						<td>{overallObjectiveByYear.get(year) ?? 0}</td>
					{/each}
				</tr>
				<tr class="objective-total">
					<th scope="row">{$_('indicator.table.objectives')}</th>
					{#each years as year}
						<td>{objectivesByYear.get(year) ?? 0}</td>
					{/each}
				</tr>
				{#each relatedContainers.filter(isObjectiveContainer) as containerWithObjective}
					{@const valuesByYear = new Map(containerWithObjective.payload.wantedValues)}
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

				{#each measureContainers.filter(({ payload }) => payload.status === status.enum['status.done']) as measure}
					{@const valuesByYear = new Map(
						effectContainers
							.filter(
								({ relation }) =>
									relation.findIndex(
										({ object, predicate }) =>
											predicate == predicates.enum['is-part-of'] && object == measure.guid
									) > -1
							)
							.flatMap(({ payload }) => payload.achievedValues)
					)}
					<tr class="done">
						<th scope="row">{measure.payload.title}</th>
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
				{#each measureContainers.filter(({ payload }) => payload.status === status.enum['status.in_implementation']) as measure}
					{@const valuesByYear = new Map(
						effectContainers
							.filter(
								({ relation }) =>
									relation.findIndex(
										({ object, predicate }) =>
											predicate === predicates.enum['is-part-of'] && object === measure.guid
									) > -1
							)
							.flatMap(({ payload }) => payload.plannedValues)
					)}
					<tr class="in-progress">
						<th scope="row">{measure.payload.title}</th>
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
				{#each measureContainers.filter(({ payload }) => payload.status === status.enum['status.in_planning']) as measure}
					{@const valuesByYear = new Map(
						effectContainers
							.filter(
								({ relation }) =>
									relation.findIndex(
										({ object, predicate }) =>
											predicate === predicates.enum['is-part-of'] && object === measure.guid
									) > -1
							)
							.flatMap(({ payload }) => payload.plannedValues)
					)}
					<tr class="in-planning">
						<th scope="row">{measure.payload.title}</th>
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
				{#each measureContainers.filter(({ payload }) => payload.status === status.enum['status.idea']) as measure}
					{@const valuesByYear = new Map(
						effectContainers
							.filter(
								({ relation }) =>
									relation.findIndex(
										({ object, predicate }) =>
											predicate === predicates.enum['is-part-of'] && object === measure.guid
									) > -1
							)
							.flatMap(({ payload }) => payload.plannedValues)
					)}
					<tr class="idea">
						<th scope="row">{measure.payload.title}</th>
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

	.overall-objective {
		background-color: var(--color-gray-800);
		color: var(--color-gray-050);
	}
</style>
