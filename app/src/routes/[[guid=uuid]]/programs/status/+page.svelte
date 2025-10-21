<script lang="ts">
	import { _ } from 'svelte-i18n';
	import Board from '$lib/components/Board.svelte';
	import BoardColumn from '$lib/components/BoardColumn.svelte';
	import Help from '$lib/components/Help.svelte';
	import MaybeDragZone from '$lib/components/MaybeDragZone.svelte';
	import ProgramsPage from '$lib/components/ProgramsPage.svelte';
	import { payloadTypes, programStatus, status } from '$lib/models';
	import { mayCreateContainer } from '$lib/stores';
	import { programStatusBackgrounds, programStatusHoverColors } from '$lib/theme/models';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<ProgramsPage {data}>
	<Board>
		{#each programStatus.options as statusOption}
			<BoardColumn
				--background={programStatusBackgrounds.get(statusOption)}
				--hover-border-color={programStatusHoverColors.get(statusOption)}
				addItemUrl={$mayCreateContainer(
					payloadTypes.enum.measure,
					data.currentOrganizationalUnit?.guid ?? data.currentOrganization.guid
				)
					? `#create=program&programStatus=${statusOption}`
					: undefined}
				title={$_(statusOption)}
			>
				<MaybeDragZone
					containers={data.containers.filter(
						(c) => 'programStatus' in c.payload && c.payload.programStatus === statusOption
					)}
				/>
			</BoardColumn>
		{/each}
	</Board>
	<Help slug="programs-status" />
</ProgramsPage>
