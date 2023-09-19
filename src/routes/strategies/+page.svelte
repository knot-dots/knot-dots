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
	{#each levels.options.filter((l) => l !== levels.enum['level.regional']) as levelOption}
		<BoardColumn addItemUrl="/strategy/new?level={levelOption}" title={$_(levelOption)}>
			<div class="vertical-scroll-wrapper masked-overflow">
				{#each data.containers.filter((c) => 'level' in c.payload && c.payload.level === levelOption) as container}
					<Card {container} />
				{/each}
			</div>
		</BoardColumn>
	{/each}
</Board>

{#if data.overlayData}
	<Overlay {...data.overlayData} />
{/if}
