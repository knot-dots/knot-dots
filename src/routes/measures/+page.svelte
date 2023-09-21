<script lang="ts">
	import { _ } from 'svelte-i18n';
	import Board from '$lib/components/Board.svelte';
	import BoardColumn from '$lib/components/BoardColumn.svelte';
	import Card from '$lib/components/Card.svelte';
	import Overlay from '$lib/components/Overlay.svelte';
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
			<div class="vertical-scroll-wrapper masked-overflow">
				{#each data.containers.filter((c) => 'status' in c.payload && c.payload.status === statusOption) as container}
					<Card {container} />
				{/each}
			</div>
		</BoardColumn>
	{/each}
</Board>

{#if data.overlayData}
	<Overlay {...data.overlayData} />
{/if}
