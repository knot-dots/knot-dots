<script lang="ts">
	import { _ } from 'svelte-i18n';
	import Board from '$lib/components/Board.svelte';
	import BoardColumn from '$lib/components/BoardColumn.svelte';
	import Help from '$lib/components/Help.svelte';
	import MaybeDragZone from '$lib/components/MaybeDragZone.svelte';
	import MeasuresPage from '$lib/components/MeasuresPage.svelte';
	import { payloadTypes, status } from '$lib/models';
	import { mayCreateContainer } from '$lib/stores';
	import { statusBackgrounds, statusHoverColors } from '$lib/theme/models';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<MeasuresPage {data}>
	<Board>
		{#each status.options as statusOption}
			<BoardColumn
				--background={statusBackgrounds.get(statusOption)}
				--hover-border-color={statusHoverColors.get(statusOption)}
				addItemUrl={$mayCreateContainer(
					payloadTypes.enum.measure,
					data.currentOrganizationalUnit?.guid ?? data.currentOrganization.guid
				)
					? `#create=measure&status=${statusOption}`
					: undefined}
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
