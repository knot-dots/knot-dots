<script lang="ts">
	import { page } from '$app/state';
	import EditableOrganizationalUnitDetailView from '$lib/components/EditableOrganizationalUnitDetailView.svelte';
	import EditableOrganizationDetailView from '$lib/components/EditableOrganizationDetailView.svelte';
	import Help from '$lib/components/Help.svelte';
	import Layout from '$lib/components/Layout.svelte';
	import OrganizationDetailView from '$lib/components/OrganizationDetailView.svelte';
	import { createFeatureDecisions } from '$lib/features';
	import { isOrganizationalUnitContainer, isOrganizationContainer } from '$lib/models';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<Layout>
	<svelte:fragment slot="main">
		<div class="detail-page-content">
			<div class="content-details masked-overflow">
				{#if createFeatureDecisions(page.data.features).useEditableDetailView()}
					{#if isOrganizationContainer(data.container)}
						<EditableOrganizationDetailView
							container={data.container}
							relatedContainers={[
								...data.indicators,
								...data.containersRelatedToIndicators,
								...data.strategies,
								...data.measures
							]}
						/>
					{:else if isOrganizationalUnitContainer(data.container)}
						<EditableOrganizationalUnitDetailView
							container={data.container}
							relatedContainers={[
								...data.indicators,
								...data.containersRelatedToIndicators,
								...data.strategies,
								...data.measures
							]}
						/>
					{/if}
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
		<Help
			slug={isOrganizationContainer(data.container)
				? 'organization-view'
				: 'organizational-unit-view'}
		/>
	</svelte:fragment>
</Layout>

<style>
	.content-details {
		min-width: calc(100vw - var(--sidebar-max-width) - 10rem);
	}
</style>
