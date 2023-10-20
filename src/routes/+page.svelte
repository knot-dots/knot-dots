<script lang="ts">
	import { setContext } from 'svelte';
	import { _ } from 'svelte-i18n';
	import Board from '$lib/components/Board.svelte';
	import BoardColumn from '$lib/components/BoardColumn.svelte';
	import Overlay from '$lib/components/Overlay.svelte';
	import MaybeDragZone from '$lib/components/MaybeDragZone.svelte';
	import RelationOverlay from '$lib/components/RelationOverlay.svelte';
	import { payloadTypes } from '$lib/models';
	import type { PageData } from './$types';

	export let data: PageData;

	setContext('mayShowRelationButton', true);

	const columns = [
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
			addItemUrl="?overlay-new={column.payloadType}"
			itemType={column.payloadType}
			title={$_(column.title)}
		>
			<MaybeDragZone
				containers={data.containers.filter((c) => c.payload.type === column.payloadType)}
			/>
		</BoardColumn>
	{/each}
</Board>

{#if data.overlayData}
	<Overlay {...data.overlayData} />
{/if}

{#if data.relationOverlayData}
	<RelationOverlay {...data.relationOverlayData} />
{/if}
