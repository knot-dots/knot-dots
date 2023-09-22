<script lang="ts">
	import { _ } from 'svelte-i18n';
	import Board from '$lib/components/Board.svelte';
	import BoardColumn from '$lib/components/BoardColumn.svelte';
	import MaybeDragZone from '$lib/components/MaybeDragZone.svelte';
	import Overlay from '$lib/components/Overlay.svelte';
	import RelationOverlay from '$lib/components/RelationOverlay.svelte';
	import { status } from '$lib/models';
	import { statusColors, statusIcons } from '$lib/theme/models';
	import type { PageData } from './$types';

	export let data: PageData;
</script>

<Board>
	{#each status.options as statusOption}
		<BoardColumn
			--bg-color="var(--color-{statusColors.get(statusOption)}-050)"
			addItemUrl="/measure/new?status={statusOption}"
			title={$_(statusOption)}
			icon={statusIcons.get(statusOption)}
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
