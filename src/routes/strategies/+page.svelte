<script lang="ts">
	import { _ } from 'svelte-i18n';
	import Board from '$lib/components/Board.svelte';
	import BoardColumn from '$lib/components/BoardColumn.svelte';
	import Card from '$lib/components/Card.svelte';
	import Overlay from '$lib/components/Overlay.svelte';
	import { levels } from '$lib/models';
	import type { PageData } from './$types';

	export let data: PageData;
</script>

<Board>
	{#each levels.options as levelOption}
		<BoardColumn containerType="strategy" title={$_(levelOption)} level={levelOption}>
			{#each data.containers.filter((c) => 'level' in c.payload && c.payload.level == levelOption) as container}
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
