<script lang="ts">
	import { _ } from 'svelte-i18n';
	import Board from '$lib/components/Board.svelte';
	import BoardColumn from '$lib/components/BoardColumn.svelte';
	import Card from '$lib/components/Card.svelte';
	import {
		computeColumnTitleForGoals,
		type Container,
		containersByHierarchyLevel,
		isGoalContainer,
		overlayKey,
		payloadTypes,
		predicates,
		type ProgramContainer
	} from '$lib/models';

	interface Props {
		containers: Container[];
		program?: ProgramContainer;
	}

	let { containers, program }: Props = $props();

	let goals = $derived(
		containersByHierarchyLevel(
			containers
				.filter(isGoalContainer)
				.filter(({ relation }) =>
					relation.some(({ predicate }) => predicate === predicates.enum['is-part-of-program'])
				)
		)
	);

	let columns = $derived([
		...Array.from(goals.entries()).map(([hierarchyLevel, containers]) => ({
			addItemUrl: addItemUrl([
				[overlayKey.enum.create, payloadTypes.enum.goal],
				['hierarchyLevel', String(hierarchyLevel)],
				...(program
					? [
							[predicates.enum['is-part-of-program'], program.guid],
							['managedBy', program.managed_by]
						]
					: [])
			]),
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

	function addItemUrl(init: string[][]) {
		const params = new URLSearchParams(init);
		return `#${params.toString()}`;
	}
</script>

<Board>
	{#each columns as column (column.key)}
		<BoardColumn addItemUrl={column.addItemUrl} title={column.title}>
			<div class="vertical-scroll-wrapper">
				{#each column.containers as container (container.guid)}
					<Card {container} showRelationFilter />
				{/each}
			</div>
		</BoardColumn>
	{/each}
</Board>
