<script lang="ts">
	import { _ } from 'svelte-i18n';
	import Board from '$lib/components/Board.svelte';
	import BoardColumn from '$lib/components/BoardColumn.svelte';
	import MaybeDragZone from '$lib/components/MaybeDragZone.svelte';
	import { type ResolutionContainer, resolutionStatus } from '$lib/models';
	import { resolutionStatusBackgrounds, resolutionStatusHoverColors } from '$lib/theme/models';

	export let containers: ResolutionContainer[];
</script>

<Board>
	{#each resolutionStatus.options as statusOption}
		<BoardColumn
			--background={resolutionStatusBackgrounds.get(statusOption)}
			--hover-border-color={resolutionStatusHoverColors.get(statusOption)}
			title={$_(statusOption)}
		>
			<MaybeDragZone
				containers={containers.filter(({ payload }) => payload.resolutionStatus === statusOption)}
			/>
		</BoardColumn>
	{/each}
</Board>
