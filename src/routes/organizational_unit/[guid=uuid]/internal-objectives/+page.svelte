<script lang="ts">
	import { setContext } from 'svelte';
	import { _ } from 'svelte-i18n';
	import { browser } from '$app/environment';
	import Board from '$lib/components/Board.svelte';
	import BoardColumn from '$lib/components/BoardColumn.svelte';
	import Layout from '$lib/components/Layout.svelte';
	import MaybeDragZone from '$lib/components/MaybeDragZone.svelte';
	import OrganizationalUnitIncludedFilter from '$lib/components/OrganizationalUnitIncludedFilter.svelte';
	import OrganizationalUnitTabs from '$lib/components/OrganizationalUnitTabs.svelte';
	import Overlay from '$lib/components/Overlay.svelte';
	import RelationOverlay from '$lib/components/RelationOverlay.svelte';
	import Search from '$lib/components/Search.svelte';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import Sort from '$lib/components/Sort.svelte';
	import { payloadTypes } from '$lib/models';
	import { mayCreateContainer, overlay, sidebarToggle } from '$lib/stores';
	import type { PageData } from './$types';

	export let data: PageData;

	setContext('mayShowRelationButton', true);

	const columns = [
		{
			title: 'internal_objective.internal_strategies',
			payloadType: payloadTypes.enum['internal_objective.internal_strategy']
		},
		{
			title: 'internal_objective.visions',
			payloadType: payloadTypes.enum['internal_objective.vision']
		},
		{
			title: 'internal_objective.strategic_goals',
			payloadType: payloadTypes.enum['internal_objective.strategic_goal']
		},
		{
			title: 'internal_objective.milestones',
			payloadType: payloadTypes.enum['internal_objective.milestone']
		},
		{
			title: 'internal_objective.tasks',
			payloadType: payloadTypes.enum['internal_objective.task']
		}
	];
</script>

<Layout>
	<Sidebar slot="sidebar">
		<OrganizationalUnitTabs container={data.container} slot="tabs" />
		<Search slot="search" let:toggleSidebar on:click={$sidebarToggle ? undefined : toggleSidebar} />
		<OrganizationalUnitIncludedFilter slot="filters" />
		<Sort slot="sort" />
	</Sidebar>

	<svelte:fragment slot="main">
		<Board>
			{#each columns as column (column.title)}
				<BoardColumn
					addItemUrl={$mayCreateContainer(column.payloadType)
						? `#create=${column.payloadType}`
						: undefined}
					title={$_(column.title)}
				>
					<MaybeDragZone
						containers={data.containers.filter((c) => c.payload.type === column.payloadType)}
					/>
				</BoardColumn>
			{/each}
		</Board>

		{#if browser && $overlay.revisions.length > 0}
			<Overlay {...$overlay} />
		{/if}

		{#if browser && $overlay.object}
			<RelationOverlay object={$overlay.object} />
		{/if}
	</svelte:fragment>
</Layout>
