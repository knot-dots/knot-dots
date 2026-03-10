<script lang="ts">
	import { _ } from 'svelte-i18n';
	import Board from '$lib/components/Board.svelte';
	import BoardColumn from '$lib/components/BoardColumn.svelte';
	import Help from '$lib/components/Help.svelte';
	import MaybeDragZone from '$lib/components/MaybeDragZone.svelte';
	import MeasuresPage from '$lib/components/MeasuresPage.svelte';
	import { payloadTypes, status } from '$lib/models';
	import { statusBackgrounds, statusHoverColors } from '$lib/theme/models';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<MeasuresPage
	{data}
	showSaveWorkspace
	savePayloadType={[payloadTypes.enum.measure, payloadTypes.enum.simple_measure]}
>
	<Board>
		{#each status.options as statusOption (statusOption)}
			<BoardColumn
				--background={statusBackgrounds.get(statusOption)}
				--hover-border-color={statusHoverColors.get(statusOption)}
				addItemUrl={`#create=measure&status=${statusOption}`}
				title={$_(statusOption)}
			>
				<MaybeDragZone
					containers={data.containers.filter(
						(c) => 'status' in c.payload && c.payload.status === statusOption
					)}
				/>
			</BoardColumn>
		{/each}
	</Board>
	<Help slug="measures-status" />
</MeasuresPage>
