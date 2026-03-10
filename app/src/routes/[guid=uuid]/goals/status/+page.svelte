<script lang="ts">
	import { _ } from 'svelte-i18n';
	import Board from '$lib/components/Board.svelte';
	import BoardColumn from '$lib/components/BoardColumn.svelte';
	import GoalsPage from '$lib/components/GoalsPage.svelte';
	import Help from '$lib/components/Help.svelte';
	import MaybeDragZone from '$lib/components/MaybeDragZone.svelte';
	import { goalStatus, payloadTypes } from '$lib/models';
	import { goalStatusBackgrounds, goalStatusHoverColors } from '$lib/theme/models';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<GoalsPage {data} showSaveWorkspace savePayloadType={[payloadTypes.enum.goal]}>
	<Board>
		{#each goalStatus.options as statusOption (statusOption)}
			<BoardColumn
				--background={goalStatusBackgrounds.get(statusOption)}
				--hover-border-color={goalStatusHoverColors.get(statusOption)}
				addItemUrl={`#create=goal&goalStatus=${statusOption}`}
				title={$_(statusOption)}
			>
				<MaybeDragZone
					containers={data.containers.filter(
						(c) => 'goalStatus' in c.payload && c.payload.goalStatus === statusOption
					)}
				/>
			</BoardColumn>
		{/each}
	</Board>
	<Help slug="goals-status" />
</GoalsPage>
