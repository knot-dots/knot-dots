<script lang="ts">
	import Header from '$lib/components/Header.svelte';
	import { type PageContainer } from '$lib/models';

	interface Props {
		container: PageContainer;
	}

	let { container }: Props = $props();
</script>

<Header sortOptions={[]} workspaceOptions={[]} />
<div class="content-details masked-overflow">
	{#await import('./EditablePageDetailView.svelte') then { default: EditablePageDetailView }}
		<EditablePageDetailView {container} revisions={[container]} />
	{/await}
</div>
<footer class="content-footer">
	<div class="content-actions"></div>
</footer>
