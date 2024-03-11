<script lang="ts">
	import { _ } from 'svelte-i18n';
	import Info from '~icons/knotdots/info';
	import Members from '~icons/knotdots/members';
	import Organization from '~icons/knotdots/organization';
	import SidebarTab from '$lib/components/SidebarTab.svelte';
	import type { OrganizationContainer } from '$lib/models';
	import { ability } from '$lib/stores';

	export let container: OrganizationContainer;
</script>

<SidebarTab href="/organization/{container.guid}" iconSource={Info} text={$_('information')} />
{#if container.payload.boards.includes('board.organizational_units')}
	<SidebarTab
		href="/organization/{container.guid}/organizational_units"
		iconSource={Organization}
		text={$_('board.organizational_units')}
	/>
{/if}
{#if $ability.can('update', container)}
	<SidebarTab
		href="/organization/{container.guid}/members"
		iconSource={Members}
		text={$_('members')}
	/>
{/if}
