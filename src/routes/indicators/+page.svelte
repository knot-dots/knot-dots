<script lang="ts">
	import AudienceFilter from '$lib/components/AudienceFilter.svelte';
	import IndicatorCategoryFilter from '$lib/components/IndicatorCategoryFilter.svelte';
	import IndicatorWorkspaces from '$lib/components/IndicatorWorkspaces.svelte';
	import Indicators from '$lib/components/Indicators.svelte';
	import IndicatorsIncludedFilter from '$lib/components/IndicatorsIncludedFilter.svelte';
	import Layout from '$lib/components/Layout.svelte';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import { isOrganizationalUnitContainer, isOrganizationContainer } from '$lib/models';
	import type { PageData } from './$types';

	export let data: PageData;
</script>

<Layout>
	<svelte:fragment slot="sidebar">
		{#if isOrganizationContainer(data.container)}
			<Sidebar helpSlug="indicators">
				<IndicatorWorkspaces slot="workspaces" />

				<svelte:fragment slot="filters">
					<AudienceFilter />
					<IndicatorCategoryFilter />
				</svelte:fragment>
			</Sidebar>
		{:else if isOrganizationalUnitContainer(data.container)}
			<Sidebar helpSlug="indicators">
				<IndicatorWorkspaces slot="workspaces" />

				<svelte:fragment slot="filters">
					<AudienceFilter />
					<IndicatorsIncludedFilter />
					<IndicatorCategoryFilter />
				</svelte:fragment>
			</Sidebar>
		{/if}
	</svelte:fragment>

	<svelte:fragment slot="main">
		<Indicators containers={data.containers} />
	</svelte:fragment>
</Layout>
