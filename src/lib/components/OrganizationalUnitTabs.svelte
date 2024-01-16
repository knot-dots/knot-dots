<script lang="ts">
	import { BuildingLibrary, ChartBarSquare, InformationCircle, UserGroup } from 'svelte-hero-icons';
	import { _ } from 'svelte-i18n';
	import SidebarTab from '$lib/components/SidebarTab.svelte';
	import type { OrganizationalUnitContainer } from '$lib/models';
	import { ability } from '$lib/stores';

	export let container: OrganizationalUnitContainer;
</script>

<SidebarTab
	href="/organizational_unit/{container.guid}"
	iconSource={InformationCircle}
	text={$_('information')}
/>
{#if container.payload.boards.includes('board.indicators')}
	<SidebarTab
		href="/organizational_unit/{container.guid}/indicators"
		iconSource={ChartBarSquare}
		text={$_('board.indicators')}
	/>
{/if}
<SidebarTab
	href="/organizational_unit/{container.guid}/organizational_units"
	iconSource={BuildingLibrary}
	text={$_('board.organizational_units')}
/>
{#if $ability.can('update', container)}
	<SidebarTab
		href="/organizational_unit/{container.guid}/members"
		iconSource={UserGroup}
		text={$_('members')}
	/>
{/if}
