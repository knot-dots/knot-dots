<script lang="ts">
	import { page } from '$app/stores';
	import EditableOrganizationDetailView from '$lib/components/EditableOrganizationDetailView.svelte';
	import Layout from '$lib/components/Layout.svelte';
	import OrganizationDetailView from '$lib/components/OrganizationDetailView.svelte';
	import OrganizationTabs from '$lib/components/OrganizationTabs.svelte';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import { createFeatureDecisions } from '$lib/features';
	import type { PageData } from './$types';

	export let data: PageData;
</script>

<Layout>
	<Sidebar helpSlug="organization-view" slot="sidebar">
		<OrganizationTabs container={data.container} slot="tabs" />
	</Sidebar>

	<svelte:fragment slot="main">
		<div class="detail-page-content">
			<div class="content-details masked-overflow">
				{#if createFeatureDecisions($page.data.features).useEditableDetailView()}
					<EditableOrganizationDetailView
						container={data.container}
						relatedContainers={[
							...data.indicators,
							...data.containersRelatedToIndicators,
							...data.strategies,
							...data.measures
						]}
					/>
				{:else}
					<OrganizationDetailView
						container={data.container}
						containersRelatedToIndicators={data.containersRelatedToIndicators}
						indicators={data.indicators}
						measures={data.measures}
						strategies={data.strategies}
					/>
				{/if}
			</div>
		</div>
	</svelte:fragment>
</Layout>
