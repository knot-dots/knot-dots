<script lang="ts">
	import EditableOrganizationalUnitDetailView from '$lib/components/EditableOrganizationalUnitDetailView.svelte';
	import EditableOrganizationDetailView from '$lib/components/EditableOrganizationDetailView.svelte';
	import Help from '$lib/components/Help.svelte';
	import Layout from '$lib/components/Layout.svelte';
	import { isOrganizationalUnitContainer, isOrganizationContainer } from '$lib/models';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<Layout>
	{#snippet main()}
		{#key data.container.guid}
			<div class="detail-page-content">
				<div class="content-details">
					{#if isOrganizationContainer(data.container)}
						<EditableOrganizationDetailView
							container={data.container}
							relatedContainers={data.relatedContainers}
						/>
					{:else if isOrganizationalUnitContainer(data.container)}
						<EditableOrganizationalUnitDetailView
							container={data.container}
							relatedContainers={data.relatedContainers}
						/>
					{/if}
				</div>
			</div>

			<Help
				slug={isOrganizationContainer(data.container)
					? 'organization-view'
					: 'organizational-unit-view'}
			/>
		{/key}
	{/snippet}
</Layout>

<style>
	.detail-page-content {
		min-width: calc(100vw - var(--sidebar-max-width) - 1px);
	}
</style>
