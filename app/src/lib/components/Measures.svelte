<script lang="ts">
	import { _ } from 'svelte-i18n';
	import Board from '$lib/components/Board.svelte';
	import BoardColumn from '$lib/components/BoardColumn.svelte';
	import MaybeDragZone from '$lib/components/MaybeDragZone.svelte';
	import { type ContainerWithEffect, status } from '$lib/models';
	import { statusBackgrounds, statusHoverColors } from '$lib/theme/models';

	interface Props {
		containers: ContainerWithEffect[];
	}

	let { containers }: Props = $props();
</script>

<Board>
	{#each status.options as statusOption (statusOption)}
		<BoardColumn
			--background={statusBackgrounds.get(statusOption)}
			--hover-border-color={statusHoverColors.get(statusOption)}
			title={$_(statusOption)}
		>
			<MaybeDragZone
				containers={containers.filter(({ payload }) => payload.status === statusOption)}
			/>
		</BoardColumn>
	{/each}
</Board>
