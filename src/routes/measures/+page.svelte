<script lang="ts">
	import { setContext } from 'svelte';
	import { _ } from 'svelte-i18n';
	import { browser } from '$app/environment';
	import Board from '$lib/components/Board.svelte';
	import BoardColumn from '$lib/components/BoardColumn.svelte';
	import MaybeDragZone from '$lib/components/MaybeDragZone.svelte';
	import Overlay from '$lib/components/Overlay.svelte';
	import RelationOverlay from '$lib/components/RelationOverlay.svelte';
	import { payloadTypes, status } from '$lib/models';
	import { overlay } from '$lib/stores';
	import { statusBackgrounds, statusHoverColors, statusIcons } from '$lib/theme/models';
	import type { PageData } from './$types';

	export let data: PageData;

	setContext('mayShowRelationButton', true);
</script>

<Board>
	{#each status.options as statusOption}
		<BoardColumn
			--background={statusBackgrounds.get(statusOption)}
			--hover-border-color={statusHoverColors.get(statusOption)}
			addItemUrl="#create=measure&status={statusOption}"
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

{#if browser && $overlay.revisions.length > 0}
	<Overlay {...$overlay} />
{/if}

{#if data.relationOverlayData}
	<RelationOverlay {...data.relationOverlayData} />
{/if}
