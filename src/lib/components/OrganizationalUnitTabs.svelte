<script lang="ts">
	import { _ } from 'svelte-i18n';
	import Info from '~icons/knotdots/info';
	import Members from '~icons/knotdots/members';
	import Organization from '~icons/knotdots/organization';
	import SidebarTab from '$lib/components/SidebarTab.svelte';
	import type { OrganizationalUnitContainer } from '$lib/models';
	import { ability } from '$lib/stores';

	export let container: OrganizationalUnitContainer;
</script>

<SidebarTab
	href="/organizational_unit/{container.guid}"
	iconSource={Info}
	text={$_('information')}
/>
<SidebarTab
	href="/organizational_unit/{container.guid}/organizational_units"
	iconSource={Organization}
	text={$_('board.organizational_units')}
/>
{#if $ability.can('update', container)}
	<SidebarTab
		href="/organizational_unit/{container.guid}/members"
		iconSource={Members}
		text={$_('members')}
	/>
{/if}
