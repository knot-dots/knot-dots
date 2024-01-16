<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { browser } from '$app/environment';
	import Board from '$lib/components/Board.svelte';
	import BoardColumn from '$lib/components/BoardColumn.svelte';
	import Layout from '$lib/components/Layout.svelte';
	import OrganizationCard from '$lib/components/OrganizationCard.svelte';
	import OrganizationTabs from '$lib/components/OrganizationTabs.svelte';
	import Overlay from '$lib/components/Overlay.svelte';
	import Search from '$lib/components/Search.svelte';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import { payloadTypes } from '$lib/models';
	import type { OrganizationalUnitContainer } from '$lib/models';
	import { mayCreateContainer, overlay, sidebarToggle } from '$lib/stores';
	import type { PageData } from './$types';

	export let data: PageData;

	let byLevel: Map<number, OrganizationalUnitContainer[]>;

	$: {
		byLevel = new Map<number, OrganizationalUnitContainer[]>();

		for (const level of [1, 2, 3, 4]) {
			byLevel.set(
				level,
				data.containers.filter(({ payload }) => payload.level === level)
			);
		}
	}
</script>

<Layout>
	<Sidebar helpSlug="organizational-units" slot="sidebar">
		<OrganizationTabs container={data.container} slot="tabs" />
		<Search slot="search" let:toggleSidebar on:click={$sidebarToggle ? undefined : toggleSidebar} />
	</Sidebar>

	<svelte:fragment slot="main">
		<Board>
			{#each byLevel.entries() as [level, containers]}
				<BoardColumn
					addItemUrl={$mayCreateContainer(payloadTypes.enum.organizational_unit)
						? `#create=${payloadTypes.enum.organizational_unit}&level=${level}`
						: undefined}
					title={$_('organizational_unit_level', { values: { level } })}
				>
					<div class="vertical-scroll-wrapper masked-overflow">
						{#each containers as container}
							<OrganizationCard {container} showRelationFilter />
						{/each}
					</div>
				</BoardColumn>
			{/each}
		</Board>

		{#if browser && $overlay.revisions.length > 0}
			<Overlay {...$overlay} />
		{/if}
	</svelte:fragment>
</Layout>
