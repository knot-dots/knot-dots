<script lang="ts">
	import { _ } from 'svelte-i18n';
	import Board from '$lib/components/Board.svelte';
	import BoardColumn from '$lib/components/BoardColumn.svelte';
	import Help from '$lib/components/Help.svelte';
	import MaybeDragZone from '$lib/components/MaybeDragZone.svelte';
	import ProgramsPage from '$lib/components/ProgramsPage.svelte';
	import { status } from '$lib/models';
	import withOptimistic from '$lib/client/withOptimistic';
	import { lastCreatedContainer, lastUpdatedContainers } from '$lib/stores';
	import { statusBackgrounds, statusHoverColors } from '$lib/theme/models';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let containers = $derived(
		withOptimistic(data.containers, $lastCreatedContainer, $lastUpdatedContainers)
	);
</script>

<ProgramsPage {data}>
	<Board>
		{#each status.options as statusOption (statusOption)}
			<BoardColumn
				--background={statusBackgrounds.get(statusOption)}
				--hover-border-color={statusHoverColors.get(statusOption)}
				addItemUrl={`#create=program&status=${statusOption}`}
				title={statusOption === 'status.in_operation'
					? $_('status.in_application')
					: $_(statusOption)}
			>
				<MaybeDragZone
					containers={containers.filter(
						(c) => 'status' in c.payload && c.payload.status === statusOption
					)}
				/>
			</BoardColumn>
		{/each}
	</Board>
	<Help slug="strategies-status" />
</ProgramsPage>
