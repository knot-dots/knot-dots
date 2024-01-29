<script lang="ts">
	import { BuildingLibrary, InformationCircle, UserGroup } from 'svelte-hero-icons';
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
