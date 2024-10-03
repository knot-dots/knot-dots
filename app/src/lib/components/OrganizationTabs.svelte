<script lang="ts">
	import { _ } from 'svelte-i18n';
	import ArrowUpOnSquareStack from '~icons/heroicons/arrow-up-on-square-stack-20-solid';
	import Info from '~icons/knotdots/info';
	import Organization from '~icons/knotdots/organization';
	import { page } from '$app/stores';
	import SidebarTab from '$lib/components/SidebarTab.svelte';
	import { type OrganizationContainer, payloadTypes } from '$lib/models';
	import { createFeatureDecisions } from '$lib/features';
	import { mayCreateContainer } from '$lib/stores';

	export let container: OrganizationContainer;
</script>

<SidebarTab href="/organization/{container.guid}" iconSource={Info} text={$_('information')} />
{#if container.payload.boards.includes('board.organizational_units')}
	<SidebarTab
		href="/organization/{container.guid}/organizational_units"
		iconSource={Organization}
		text={$_('board.organizational_units')}
	/>
	{#if createFeatureDecisions($page.data.features).useImportFromCsv() && $mayCreateContainer(payloadTypes.enum.strategy, $page.data.currentOrganization.guid)}
		<SidebarTab href="/import" iconSource={ArrowUpOnSquareStack} text={$_('import')} />
	{/if}
{/if}
