<script lang="ts">
	import Help from '$lib/components/Help.svelte';
	import Layout from '$lib/components/Layout.svelte';
	import EditablePageDetailView from '$lib/components/EditablePageDetailView.svelte';
	import { isPageContainer } from '$lib/models';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let container = $derived.by(() => {
		let _ = $state(data.container);
		return _;
	});
</script>

<Layout>
	{#snippet main()}
		<div class="detail-page-content">
			<div class="content-details">
				{#if isPageContainer(container)}
					<EditablePageDetailView
						bind:container
						relatedContainers={data.relatedContainers}
						revisions={data.revisions}
					/>
				{/if}
			</div>
		</div>

		<Help slug={`${data.container.payload.type.replace('_', '-')}-view`} />
	{/snippet}
</Layout>

<style>
	.detail-page-content {
		min-width: calc(100vw - var(--sidebar-max-width) - 1px);
	}
</style>
