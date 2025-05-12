<script lang="ts">
	import { _ } from 'svelte-i18n';
	import Board from '$lib/components/Board.svelte';
	import BoardColumn from '$lib/components/BoardColumn.svelte';
	import Card from '$lib/components/Card.svelte';
	import {
		computeColumnTitleForGoals,
		type Container,
		goalsByHierarchyLevel,
		isGoalContainer,
		isPartOf,
		isStrategyContainer,
		payloadTypes
	} from '$lib/models';

	export let containers: Container[];
	export let containersWithIndicatorContributions: Container[] = [];

	$: goals = goalsByHierarchyLevel(containers.filter(isGoalContainer));

	$: columns = [
		{
			addItemUrl: undefined,
			containers: containers.filter(isStrategyContainer),
			key: 'programs',
			title: $_('programs')
		},
		...Array.from(goals.entries()).map(([hierarchyLevel, containers]) => ({
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
