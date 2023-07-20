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
			title: 'internal_objectives.internal_strategy',
			payloadType: payloadTypes.enum['internal_objective.internal_strategy']
		},
		{ title: 'internal_objectives.visions', payloadType: payloadTypes.enum['internal_objective.vision'] },
		{ title: 'internal_objectives.strategic_goals', payloadType: payloadTypes.enum['internal_objective.strategic_goal'] },
		{ title: 'internal_objectives.okrs', payloadType: payloadTypes.enum['internal_objective.okr'] },
		{ title: 'internal_objectives.tasks', payloadType: payloadTypes.enum['internal_objective.task'] }
	];

	let internalStrategy = data.containers.find(
		(c) => c.payload.type === 'internal_objective.internal_strategy'
	);
</script>

<Board>
	{#each columns as column (column.title)}
		<BoardColumn
			title={$_(column.title)}
			addItemUrl={`/${column.payloadType}/new`}
			hideAddButton={(column.title === 'internal_objectives.internal_strategy' &&
				internalStrategy) ||
				(column.title !== 'internal_objectives.internal_strategy' && !internalStrategy)}
		>
			{#each data.containers.filter((c) => c.payload.type === column.payloadType) as container}
				<Card {container} relatedContainers={data.containers.filter(isPartOf)} />
			{/each}
		</BoardColumn>
	{/each}
</Board>

{#if data.overlayData}
	<Overlay {...data.overlayData} />
{/if}
