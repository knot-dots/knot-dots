<script lang="ts">
	import Layout from '$lib/components/Layout.svelte';
	import OrganizationDetailView from '$lib/components/OrganizationDetailView.svelte';
	import OrganizationTabs from '$lib/components/OrganizationTabs.svelte';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import type { PageData } from './$types';

	export let data: PageData;
</script>

<Layout>
	<Sidebar helpSlug="organization-view" slot="sidebar">
		<OrganizationTabs container={data.container} slot="tabs" />
	</Sidebar>

	<svelte:fragment slot="main">
		<div class="organization">
			<div class="detail-page-content organization-inner">
				<div class="content-details masked-overflow">
					<OrganizationDetailView
						container={data.container}
						indicators={data.indicators}
						measures={data.measures}
						strategies={data.strategies}
					/>
				</div>
			</div>
		</div>
	</svelte:fragment>
</Layout>

<style>
	.organization {
		flex: 1 1;
		overflow-x: auto;
	}

	.organization-inner {
		min-width: calc(100vw - 20rem);
		overflow-y: auto;
	}
</style>
