<script lang="ts">
	import { setContext } from 'svelte';
	import { _ } from 'svelte-i18n';
	import Board from '$lib/components/Board.svelte';
	import BoardColumn from '$lib/components/BoardColumn.svelte';
	import MaybeDragZone from '$lib/components/MaybeDragZone.svelte';
	import Overlay from '$lib/components/Overlay.svelte';
	import RelationOverlay from '$lib/components/RelationOverlay.svelte';
	import { payloadTypes, status } from '$lib/models';
	import { statusBackgrounds, statusHoverBackgrounds, statusIcons } from '$lib/theme/models';
	import type { PageData } from './$types';

	export let data: PageData;

	setContext('mayShowRelationButton', true);
</script>

<Board>
	{#each status.options as statusOption}
		<BoardColumn
			--background={statusBackgrounds.get(statusOption)}
			--hover-background={statusHoverBackgrounds.get(statusOption)}
			addItemUrl="?overlay-new=measure&status={statusOption}"
			icon={statusIcons.get(statusOption)}
			itemType={payloadTypes.enum.measure}
			title={$_(statusOption)}
		>
			<MaybeDragZone
				containers={data.containers.filter(
					(c) => 'status' in c.payload && c.payload.status === statusOption
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
