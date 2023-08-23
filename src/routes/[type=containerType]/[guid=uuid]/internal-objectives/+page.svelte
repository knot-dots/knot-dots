<script lang="ts">
	import { _ } from 'svelte-i18n';
	import Board from '$lib/components/Board.svelte';
	import BoardColumn from '$lib/components/BoardColumn.svelte';
	import Card from '$lib/components/Card.svelte';
	import Overlay from '$lib/components/Overlay.svelte';
	import { isPartOf, payloadTypes } from '$lib/models';
	import type { PageData } from './$types';

	export let data: PageData;

	const columns = [
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
	];
</script>

<Board>
	{#each columns as column (column.title)}
		<BoardColumn
			title={$_(column.title)}
			addItemUrl={`/${column.payloadType}/new/?is-part-of-measure=${data.container.revision}`}
		>
			{#each data.containers.filter((c) => c.payload.type === column.payloadType) as container}
				<Card {container} relatedContainers={data.containers.filter(isPartOf)} showRelationFilter />
			{/each}
		</BoardColumn>
	{/each}
</Board>

{#if data.overlayData}
	<Overlay {...data.overlayData} />
{/if}
