<script lang="ts">
	import Layout from '$lib/components/Layout.svelte';
	import EditableDetailView from '$lib/components/EditableDetailView.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<EditableDetailView container={data.container} revisions={data.revisions}>
	{#snippet layout(header, main)}
		<Layout {header} {main} />
	{/snippet}
</EditableDetailView>
