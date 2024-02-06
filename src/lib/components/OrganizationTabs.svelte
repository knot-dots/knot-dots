<script lang="ts">
	import { BuildingLibrary, InformationCircle, UserGroup } from 'svelte-hero-icons';
	import { _ } from 'svelte-i18n';
	import SidebarTab from '$lib/components/SidebarTab.svelte';
	import type { OrganizationContainer } from '$lib/models';
	import { ability } from '$lib/stores';

	export let container: OrganizationContainer;
</script>

<SidebarTab
	href="/organization/{container.guid}"
	iconSource={InformationCircle}
	text={$_('information')}
/>
{#if container.payload.boards.includes('board.organizational_units')}
	<SidebarTab
		href="/organization/{container.guid}/organizational_units"
		iconSource={BuildingLibrary}
		text={$_('board.organizational_units')}
	/>
{/if}
{#if $ability.can('update', container)}
	<SidebarTab
		href="/organization/{container.guid}/members"
		iconSource={UserGroup}
		text={$_('members')}
	/>
{/if}
