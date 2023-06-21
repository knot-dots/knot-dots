<script lang="ts">
	import { _ } from 'svelte-i18n';
	import Board from '$lib/components/Board.svelte';
	import BoardColumn from '$lib/components/BoardColumn.svelte';
	import Card from '$lib/components/Card.svelte';
	import Overlay from '$lib/components/Overlay.svelte';
	import { status } from '$lib/models';
	import type { PageData } from './$types';

	export let data: PageData;
</script>

<Board>
	{#each status.options as statusOption}
		<BoardColumn addItemUrl="/measure/new" title={$_(statusOption)}>
			{#each data.containers.filter((c) => 'status' in c.payload && c.payload.status == statusOption) as container}
				<Card
					guid={container.guid}
					title={container.payload.title}
					summary={container.payload.summary ?? ''}
					category={$_(container.payload.category)}
				/>
			{/each}
		</BoardColumn>
	{/each}
</Board>

{#if data.containerPreviewData}
	<Overlay
		containerPreviewData={data.containerPreviewData}
		isPartOfOptions={data.isPartOfOptions ?? []}
		relatedContainers={data.relatedContainers ?? []}
	/>
{/if}
