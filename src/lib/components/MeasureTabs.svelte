<script lang="ts">
	import {
		BuildingStorefront,
		InformationCircle,
		PencilSquare,
		Share,
		UserGroup
	} from 'svelte-hero-icons';
	import { _ } from 'svelte-i18n';
	import SidebarTab from '$lib/components/SidebarTab.svelte';
	import type { MeasureContainer } from '$lib/models';
	import { ability } from '$lib/stores';

	export let container: MeasureContainer;
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
{#if container.payload.boards.includes('board.internal_objectives')}
	<SidebarTab
		href="/{container.payload.type}/{container.guid}/internal-objectives"
		iconSource={BuildingStorefront}
		text={$_('board.internal_objectives')}
	/>
{/if}
{#if container.payload.boards.includes('board.tasks')}
	<SidebarTab
		href="/{container.payload.type}/{container.guid}/tasks"
		iconSource={PencilSquare}
		text={$_('board.tasks')}
	/>
{/if}
{#if $ability.can('update', container)}
	<SidebarTab
		href="/{container.payload.type}/{container.guid}/members"
		iconSource={UserGroup}
		text={$_('members')}
	/>
{/if}
