<script lang="ts">
	import EditableOrganizationalUnitDetailView from '$lib/components/EditableOrganizationalUnitDetailView.svelte';
	import EditableOrganizationDetailView from '$lib/components/EditableOrganizationDetailView.svelte';
	import Help from '$lib/components/Help.svelte';
	import Layout from '$lib/components/Layout.svelte';
	import { isOrganizationalUnitContainer, isOrganizationContainer } from '$lib/models';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let container = $state(data.container);
</script>

<Layout>
	<svelte:fragment slot="main">
		<div class="detail-page-content">
			<div class="content-details masked-overflow">
				{#if isOrganizationContainer(container)}
					<EditableOrganizationDetailView
						bind:container
						containersRelatedToIndicators={data.containersRelatedToIndicators}
						indicators={data.indicators}
						measures={data.measures}
						programs={data.programs}
					/>
				{:else if isOrganizationalUnitContainer(container)}
					<EditableOrganizationalUnitDetailView
						bind:container
						containersRelatedToIndicators={data.containersRelatedToIndicators}
						indicators={data.indicators}
						measures={data.measures}
						programs={data.programs}
					/>
				{/if}
			</div>
		</div>
		<Help
			slug={isOrganizationContainer(container) ? 'organization-view' : 'organizational-unit-view'}
		/>
	</svelte:fragment>
</Layout>

<style>
	.content-details {
		min-width: calc(100vw - var(--sidebar-max-width) - 10rem);
	}
</style>
