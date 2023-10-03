<script lang="ts">
	import { setContext } from 'svelte';
	import { _ } from 'svelte-i18n';
	import Board from '$lib/components/Board.svelte';
	import BoardColumn from '$lib/components/BoardColumn.svelte';
	import MaybeDragZone from '$lib/components/MaybeDragZone.svelte';
	import Overlay from '$lib/components/Overlay.svelte';
	import RelationOverlay from '$lib/components/RelationOverlay.svelte';
	import { levels, payloadTypes } from '$lib/models';
	import type { PageData } from './$types';

	export let data: PageData;

	setContext('mayShowRelationButton', true);
</script>

<Board>
	{#each levels.options.filter((l) => l !== levels.enum['level.regional']) as levelOption}
		<BoardColumn
			addItemUrl="/strategy/new?level={levelOption}"
			itemType={payloadTypes.enum.strategy}
			title={$_(levelOption)}
		>
			<MaybeDragZone
				containers={data.containers.filter(
					(c) => 'level' in c.payload && c.payload.level === levelOption
				)}
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
