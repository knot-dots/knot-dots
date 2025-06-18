<script lang="ts">
	import { page } from '$app/state';
	import Header from '$lib/components/Header.svelte';
	import PageDetailView from '$lib/components/PageDetailView.svelte';
	import { createFeatureDecisions } from '$lib/features';
	import { type PageContainer } from '$lib/models';

	interface Props {
		container: PageContainer;
	}

	let { container }: Props = $props();
</script>

<Header sortOptions={[]} workspaceOptions={[]} />
<div class="content-details masked-overflow">
	{#if createFeatureDecisions(page.data.features).useEditableDetailView()}
		{#await import('./EditablePageDetailView.svelte') then { default: EditablePageDetailView }}
			<EditablePageDetailView {container} revisions={[container]} />
		{/await}
	{:else}
		<PageDetailView {container} />
	{/if}
</div>
<footer class="content-footer">
	<div class="content-actions"></div>
</footer>
