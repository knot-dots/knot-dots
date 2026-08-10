<script lang="ts">
	import Layout from '$lib/components/Layout.svelte';
	import EditableDetailView from '$lib/components/EditableDetailView.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<EditableDetailView container={data.container} revisions={data.revisions} sections={data.sections}>
	{#snippet layout(header, content)}
		<Layout {header}>
			{#snippet main()}
				<div>{@render content()}</div>
			{/snippet}
		</Layout>
	{/snippet}
</EditableDetailView>

<style>
	div {
		display: flex;
		flex: 1 0 100%;
		flex-direction: column;
		max-height: 100%;
	}
</style>
