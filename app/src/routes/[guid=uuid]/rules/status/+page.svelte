<script lang="ts">
	import { _ } from 'svelte-i18n';
	import Board from '$lib/components/Board.svelte';
	import BoardColumn from '$lib/components/BoardColumn.svelte';
	import Help from '$lib/components/Help.svelte';
	import MaybeDragZone from '$lib/components/MaybeDragZone.svelte';
	import RulesPage from '$lib/components/RulesPage.svelte';
	import { payloadTypes, ruleStatus } from '$lib/models';
	import { ruleStatusBackgrounds, ruleStatusHoverColors } from '$lib/theme/models';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<RulesPage {data} showSaveWorkspace savePayloadType={[payloadTypes.enum.rule]}>
	<Board>
		{#each ruleStatus.options as statusOption (statusOption)}
			<BoardColumn
				--background={ruleStatusBackgrounds.get(statusOption)}
				--hover-border-color={ruleStatusHoverColors.get(statusOption)}
				addItemUrl={`#create=rule&ruleStatus=${statusOption}`}
				title={$_(statusOption)}
			>
				<MaybeDragZone
					containers={data.containers.filter(
						(c) => 'ruleStatus' in c.payload && c.payload.ruleStatus === statusOption
					)}
				/>
			</BoardColumn>
		{/each}
	</Board>
	<Help slug="rules-status" />
</RulesPage>
