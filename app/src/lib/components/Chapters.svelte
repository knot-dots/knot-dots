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
		payloadTypes,
		predicates
	} from '$lib/models';

	interface Props {
		containers: Container[];
	}

	let { containers }: Props = $props();

	let goals = $derived(
		goalsByHierarchyLevel(
			containers
				.filter(isGoalContainer)
				.filter(({ relation }) =>
					relation.some(({ predicate }) => predicate === predicates.enum['is-part-of-program'])
				)
		)
	);

	let columns = $derived([
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
						payloadTypes.enum.rule,
						payloadTypes.enum.simple_measure
					].findIndex((payloadType) => payloadType === c.payload.type) > -1
			),
			key: 'implementation',
			title: $_('payload_group.implementation')
		}
	]);
</script>

<Board>
	{#each columns as column (column.key)}
		<BoardColumn addItemUrl={column.addItemUrl} title={column.title}>
			<div class="vertical-scroll-wrapper">
				{#each column.containers as container}
					<Card {container} showRelationFilter />
				{/each}
			</div>
		</BoardColumn>
	{/each}
</Board>
