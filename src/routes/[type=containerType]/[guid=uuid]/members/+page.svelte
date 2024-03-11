<script lang="ts">
	import ChevronLeft from '~icons/heroicons/chevron-left';
	import Layout from '$lib/components/Layout.svelte';
	import MeasureTabs from '$lib/components/MeasureTabs.svelte';
	import Members from '$lib/components/Members.svelte';
	import OrganizationTabs from '$lib/components/OrganizationTabs.svelte';
	import OrganizationalUnitTabs from '$lib/components/OrganizationalUnitTabs.svelte';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import StrategyTabs from '$lib/components/StrategyTabs.svelte';
	import type { PageData } from './$types';
	import {
		isMeasureContainer,
		isOrganizationalUnitContainer,
		isOrganizationContainer,
		isStrategyContainer
	} from '$lib/models';

	export let data: PageData;
</script>

<Layout>
	<Sidebar helpSlug="members" slot="sidebar">
		<svelte:fragment slot="tabs">
			{#if isMeasureContainer(data.container)}
				<MeasureTabs container={data.container} />
			{:else if isOrganizationContainer(data.container)}
				<OrganizationTabs container={data.container} />
			{:else if isOrganizationalUnitContainer(data.container)}
				<OrganizationalUnitTabs container={data.container} />
			{:else if isStrategyContainer(data.container)}
				<StrategyTabs container={data.container} />
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
					<span class="icons">
						<button class="icons-element" type="button" on:click={() => window.history.back()}>
							<ChevronLeft />
						</button>
					</span>
				</h2>
			</header>
			<div class="content-details masked-overflow table">
				<Members container={data.container} users={data.users} />
			</div>
		</div>
	</svelte:fragment>
</Layout>
