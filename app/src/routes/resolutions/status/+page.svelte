<script lang="ts">
	import { _ } from 'svelte-i18n';
	import Board from '$lib/components/Board.svelte';
	import BoardColumn from '$lib/components/BoardColumn.svelte';
	import Help from '$lib/components/Help.svelte';
	import MaybeDragZone from '$lib/components/MaybeDragZone.svelte';
	import ResolutionsPage from '$lib/components/ResolutionsPage.svelte';
	import { payloadTypes, resolutionStatus } from '$lib/models';
	import { mayCreateContainer } from '$lib/stores';
	import { resolutionStatusBackgrounds, resolutionStatusHoverColors } from '$lib/theme/models';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<ResolutionsPage {data}>
	<Board>
		{#each resolutionStatus.options as statusOption}
			<BoardColumn
				--background={resolutionStatusBackgrounds.get(statusOption)}
				--hover-border-color={resolutionStatusHoverColors.get(statusOption)}
				addItemUrl={$mayCreateContainer(
					payloadTypes.enum.resolution,
					data.currentOrganizationalUnit?.guid ?? data.currentOrganization.guid
				)
					? `#create=resolution&resolutionStatus=${statusOption}`
					: undefined}
				title={$_(statusOption)}
			>
				<MaybeDragZone
					containers={data.containers.filter(
						(c) => 'resolutionStatus' in c.payload && c.payload.resolutionStatus === statusOption
					)}
				/>
			</BoardColumn>
		{/each}
	</Board>
	<Help slug="resolutions-status" />
</ResolutionsPage>
