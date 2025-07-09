<script lang="ts">
	import { _ } from 'svelte-i18n';
	import Board from '$lib/components/Board.svelte';
	import BoardColumn from '$lib/components/BoardColumn.svelte';
	import GoalsPage from '$lib/components/GoalsPage.svelte';
	import Help from '$lib/components/Help.svelte';
	import MaybeDragZone from '$lib/components/MaybeDragZone.svelte';
	import { goalStatus, payloadTypes } from '$lib/models';
	import { mayCreateContainer } from '$lib/stores';
	import { goalStatusBackgrounds, goalStatusHoverColors } from '$lib/theme/models';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<GoalsPage {data}>
	<Board>
		{#each goalStatus.options as statusOption}
			<BoardColumn
				--background={goalStatusBackgrounds.get(statusOption)}
				--hover-border-color={goalStatusHoverColors.get(statusOption)}
				addItemUrl={$mayCreateContainer(
					payloadTypes.enum.measure,
					data.currentOrganizationalUnit?.guid ?? data.currentOrganization.guid
				)
					? `#create=goal&goalStatus=${statusOption}`
					: undefined}
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
