<script lang="ts">
	import { _ } from 'svelte-i18n';
	import Board from '$lib/components/Board.svelte';
	import BoardColumn from '$lib/components/BoardColumn.svelte';
	import Help from '$lib/components/Help.svelte';
	import MaybeDragZone from '$lib/components/MaybeDragZone.svelte';
	import ProgramsPage from '$lib/components/ProgramsPage.svelte';
	import { programStatus } from '$lib/models';
	import withOptimistic from '$lib/client/withOptimistic';
	import { lastCreatedContainer } from '$lib/stores';
	import { programStatusBackgrounds, programStatusHoverColors } from '$lib/theme/models';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let containers = $derived(withOptimistic(data.containers, $lastCreatedContainer));
</script>

<ProgramsPage {data}>
	<Board>
		{#each programStatus.options as statusOption (statusOption)}
			<BoardColumn
				--background={programStatusBackgrounds.get(statusOption)}
				--hover-border-color={programStatusHoverColors.get(statusOption)}
				addItemUrl={`#create=program&programStatus=${statusOption}`}
				title={$_(statusOption)}
			>
				<MaybeDragZone
					containers={containers.filter(
						(c) => 'programStatus' in c.payload && c.payload.programStatus === statusOption
					)}
				/>
			</BoardColumn>
		{/each}
	</Board>
	<Help slug="rules-of-procedure-status" />
</ProgramsPage>
