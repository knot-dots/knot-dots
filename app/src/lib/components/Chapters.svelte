<script lang="ts">
	import { _ } from 'svelte-i18n';
	import Board from '$lib/components/Board.svelte';
	import BoardColumn from '$lib/components/BoardColumn.svelte';
	import Card from '$lib/components/Card.svelte';
	import {
		type Container,
		type GoalContainer,
		isGoalContainer,
		isPartOf,
		isStrategyContainer,
		payloadTypes
	} from '$lib/models';

	export let containers: Container[];
	export let containersWithIndicatorContributions: Container[] = [];

	let goalsByHierarchyLevel: Map<number, GoalContainer[]>;

	$: {
		goalsByHierarchyLevel = new Map([[1, []]]);

		for (const container of containers.filter(isGoalContainer)) {
			const hierarchyLevel = container.payload.hierarchyLevel;

			if (goalsByHierarchyLevel.has(hierarchyLevel)) {
				goalsByHierarchyLevel.set(hierarchyLevel, [
					...(goalsByHierarchyLevel.get(hierarchyLevel) as GoalContainer[]),
					container
				]);
			} else {
				goalsByHierarchyLevel.set(hierarchyLevel, [container]);
			}
		}
	}

	$: columns = [
		{
			addItemUrl: undefined,
			containers: containers.filter(isStrategyContainer),
			key: 'programs',
			title: $_('programs')
		},
		...Array.from(goalsByHierarchyLevel.entries()).map(([hierarchyLevel, containers]) => ({
			addItemUrl: `#create=goal&hierarchyLevel=${hierarchyLevel}`,
			containers,
			key: `goals-${hierarchyLevel}`,
			title: computeColumnTitleForGoals(containers)
		})),
		{
			addItemUrl: undefined,
			containers: containers.filter(
				(c) =>
					[
						payloadTypes.enum.measure,
						payloadTypes.enum.resolution,
						payloadTypes.enum.simple_measure
					].findIndex((payloadType) => payloadType === c.payload.type) > -1
			),
			key: 'implementation',
			title: $_('payload_group.implementation')
		}
	];

	function computeColumnTitleForGoals(container: GoalContainer[]): string {
		const goalTypes = new Set(container.map((c) => c.payload.goalType));

		if (goalTypes.size == 1) {
			return $_(`${goalTypes.values().next().value}.plural` as string);
		} else if (goalTypes.size >= 1) {
			return $_('goals_by_hierarchy_level', {
				values: { level: container[0].payload.hierarchyLevel }
			});
		} else {
			return $_('goals');
		}
	}
</script>

<Board>
	{#each columns as column (column.key)}
		<BoardColumn addItemUrl={column.addItemUrl} title={column.title}>
			<div class="vertical-scroll-wrapper masked-overflow">
				{#each column.containers as container}
					<Card
						{container}
						relatedContainers={containersWithIndicatorContributions.filter(isPartOf)}
						showRelationFilter
					/>
				{/each}
			</div>
		</BoardColumn>
	{/each}
</Board>
