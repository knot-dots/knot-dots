<script lang="ts">
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

{#if isPageContainer(container)}
	<EditablePageDetailView
		bind:container
		relatedContainers={data.relatedContainers}
		revisions={data.revisions}
	>
		{#snippet layout(header, main)}
			<Layout {header} {main} />
		{/snippet}
	</EditablePageDetailView>
{/if}
