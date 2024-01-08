<script lang="ts">
	import { InformationCircle, Share, UserGroup } from 'svelte-hero-icons';
	import { _ } from 'svelte-i18n';
	import SidebarTab from '$lib/components/SidebarTab.svelte';
	import type { StrategyContainer } from '$lib/models';
	import { ability } from '$lib/stores';

	export let container: StrategyContainer;
</script>

<SidebarTab
	href="/{container.payload.type}/{container.guid}"
	iconSource={InformationCircle}
	text={$_('information')}
/>
<SidebarTab
	href="/{container.payload.type}/{container.guid}/relations"
	iconSource={Share}
	text={$_('relations')}
/>
{#if $ability.can('update', container)}
	<SidebarTab
		href="/{container.payload.type}/{container.guid}/members"
		iconSource={UserGroup}
		text={$_('members')}
	/>
{/if}
