<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { browser } from '$app/environment';
	import Board from '$lib/components/Board.svelte';
	import BoardColumn from '$lib/components/BoardColumn.svelte';
	import Card from '$lib/components/Card.svelte';
	import Overlay from '$lib/components/Overlay.svelte';
	import { isInternalObjectiveContainer, isPartOf, payloadTypes } from '$lib/models';
	import { overlay } from '$lib/stores';
	import type { PageData } from './$types';

	export let data: PageData;

	const columns = isInternalObjectiveContainer(data.container)
		? [
				{
					title: 'internal_objective.internal_strategies',
					payloadType: payloadTypes.enum['internal_objective.internal_strategy']
				},
				{
					title: 'internal_objective.visions',
					payloadType: payloadTypes.enum['internal_objective.vision']
				},
				{
					title: 'internal_objective.strategic_goals',
					payloadType: payloadTypes.enum['internal_objective.strategic_goal']
				},
				{
					title: 'internal_objective.milestones',
					payloadType: payloadTypes.enum['internal_objective.milestone']
				},
				{
					title: 'internal_objective.tasks',
					payloadType: payloadTypes.enum['internal_objective.task']
				}
		  ]
		: [
				{ title: 'strategies', payloadType: payloadTypes.enum.strategy },
				{ title: 'models', payloadType: payloadTypes.enum.model },
				{ title: 'strategic_goals', payloadType: payloadTypes.enum.strategic_goal },
				{ title: 'operational_goals', payloadType: payloadTypes.enum.operational_goal },
				{ title: 'measures', payloadType: payloadTypes.enum.measure }
		  ];
</script>

<Board>
	{#each columns as column (column.title)}
		<BoardColumn
			addItemUrl={`/${column.payloadType}/new`}
			itemType={column.payloadType}
			title={$_(column.title)}
		>
			<div class="vertical-scroll-wrapper masked-overflow">
				{#each data.containers.filter((c) => c.payload.type === column.payloadType) as container}
					<Card
						{container}
						relatedContainers={data.containersWithIndicatorContributions.filter(isPartOf)}
					/>
				{/each}
			</div>
		</BoardColumn>
	{/each}
</Board>

{#if browser && $overlay.revisions.length > 0}
	<Overlay {...$overlay} />
{/if}
