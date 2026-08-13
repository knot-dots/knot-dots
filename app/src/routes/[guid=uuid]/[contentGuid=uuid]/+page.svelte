<script lang="ts">
	import EditableDetailView from '$lib/components/EditableDetailView.svelte';
	import FullscreenLayout from '$lib/components/FullscreenLayout.svelte';
	import PageLayout from '$lib/components/PageLayout.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<PageLayout>
	<EditableDetailView
		container={data.container}
		revisions={data.revisions}
		sections={data.sections}
	>
		{#snippet layout(header, content)}
			<FullscreenLayout {header}>
				{#snippet main()}
					<div>{@render content()}</div>
				{/snippet}
			</FullscreenLayout>
		{/snippet}
	</EditableDetailView>
</PageLayout>

<style>
	div {
		display: flex;
		flex: 1 0 100%;
		flex-direction: column;
		max-height: 100%;
	}
</style>
