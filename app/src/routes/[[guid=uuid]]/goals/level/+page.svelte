<script lang="ts">
	import { browser } from '$app/environment';
	import Board from '$lib/components/Board.svelte';
	import BoardColumn from '$lib/components/BoardColumn.svelte';
	import GoalsPage from '$lib/components/GoalsPage.svelte';
	import Help from '$lib/components/Help.svelte';
	import MaybeDragZone from '$lib/components/MaybeDragZone.svelte';
	import {
		computeColumnTitleForGoals,
		goalsByHierarchyLevel,
		isGoalContainer,
		predicates
	} from '$lib/models';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let goals = $derived(goalsByHierarchyLevel(data.containers.filter(isGoalContainer)));

	let columns = $derived(
		Array.from(goals.entries())
			.toSorted()
			.map(([hierarchyLevel, containers]) => ({
				addItemUrl: `#create=goal&hierarchyLevel=${hierarchyLevel}`,
				containers: containers.slice(0, browser ? undefined : 10),
				key: `goals-${hierarchyLevel}`,
				title: computeColumnTitleForGoals(containers)
			}))
	);
</script>

<GoalsPage {data}>
	<Board>
		{#each columns as column (column.key)}
			<BoardColumn addItemUrl={column.addItemUrl} title={column.title}>
				<MaybeDragZone containers={column.containers} />
			</BoardColumn>
		{/each}
	</Board>
	<Help slug="goals-level" />
</GoalsPage>
