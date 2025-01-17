<script lang="ts">
	import ChevronLeft from '~icons/heroicons/chevron-left';
	import Layout from '$lib/components/Layout.svelte';
	import Members from '$lib/components/Members.svelte';
	import OrganizationTabs from '$lib/components/OrganizationTabs.svelte';
	import OrganizationalUnitTabs from '$lib/components/OrganizationalUnitTabs.svelte';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import type { PageData } from './$types';
	import { isOrganizationalUnitContainer, isOrganizationContainer } from '$lib/models';

	export let data: PageData;
</script>

<Layout>
	<Sidebar helpSlug="members" slot="sidebar">
		<svelte:fragment slot="tabs">
			{#if isOrganizationContainer(data.container)}
				<OrganizationTabs container={data.container} />
			{:else if isOrganizationalUnitContainer(data.container)}
				<OrganizationalUnitTabs container={data.container} />
			{/if}
		</svelte:fragment>
	</Sidebar>

	<svelte:fragment slot="main">
		<div class="detail-page-content">
			<header class="content-header">
				<h2>
					{'title' in data.container.payload
						? data.container.payload.title
						: data.container.payload.name}
					<button class="button-square quiet" type="button" on:click={() => window.history.back()}>
						<ChevronLeft />
					</button>
				</h2>
			</header>
			<div class="content-details masked-overflow">
				<Members container={data.container} users={data.users} />
			</div>
		</div>
	</svelte:fragment>
</Layout>
