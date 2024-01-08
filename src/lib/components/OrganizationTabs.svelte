<script lang="ts">
	import {
		BuildingLibrary,
		BuildingStorefront,
		ChartBarSquare,
		InformationCircle,
		PencilSquare,
		UserGroup
	} from 'svelte-hero-icons';
	import { _ } from 'svelte-i18n';
	import SidebarTab from '$lib/components/SidebarTab.svelte';
	import type { OrganizationContainer } from '$lib/models';
	import { ability } from '$lib/stores';

	export let container: OrganizationContainer;
</script>

<SidebarTab
	href="/organizational/{container.guid}"
	iconSource={InformationCircle}
	text={$_('information')}
/>
{#if container.payload.boards.includes('board.indicators')}
	<SidebarTab
		href="/organization/{container.guid}/indicators"
		iconSource={ChartBarSquare}
		text={$_('board.indicators')}
	/>
{/if}
{#if container.payload.boards.includes('board.organizational_units')}
	<SidebarTab
		href="/organization/{container.guid}/organizational_units"
		iconSource={BuildingLibrary}
		text={$_('board.organizational_units')}
	/>
{/if}
{#if container.payload.boards.includes('board.internal_objectives')}
	<SidebarTab
		href="/organization/{container.guid}/internal-objectives"
		iconSource={BuildingStorefront}
		text={$_('board.internal_objectives')}
	/>
{/if}
{#if container.payload.boards.includes('board.tasks')}
	<SidebarTab
		href="/organization/{container.guid}/tasks"
		iconSource={PencilSquare}
		text={$_('board.tasks')}
	/>
{/if}
{#if $ability.can('update', container)}
	<SidebarTab
		href="/organization/{container.guid}/members"
		iconSource={UserGroup}
		text={$_('members')}
	/>
{/if}
