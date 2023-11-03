<script lang="ts">
	import { setContext } from 'svelte';
	import { _ } from 'svelte-i18n';
	import { browser } from '$app/environment';
	import Board from '$lib/components/Board.svelte';
	import BoardColumn from '$lib/components/BoardColumn.svelte';
	import MaybeDragZone from '$lib/components/MaybeDragZone.svelte';
	import Overlay from '$lib/components/Overlay.svelte';
	import RelationOverlay from '$lib/components/RelationOverlay.svelte';
	import { levels, payloadTypes } from '$lib/models';
	import { overlay } from '$lib/stores';
	import type { PageData } from './$types';

	export let data: PageData;

	setContext('mayShowRelationButton', true);
</script>

<Board>
	{#each levels.options.filter((l) => l !== levels.enum['level.regional']) as levelOption}
		<BoardColumn
			addItemUrl="#create=strategy&level={levelOption}"
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

{#if browser && $overlay.revisions.length > 0}
	<Overlay {...$overlay} />
{/if}

{#if data.relationOverlayData}
	<RelationOverlay {...data.relationOverlayData} />
{/if}
