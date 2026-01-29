<script lang="ts">
	import Header from '$lib/components/Header.svelte';
	import { type HelpContainer } from '$lib/models';

	interface Props {
		container: HelpContainer;
	}

	let { container }: Props = $props();
</script>

<Header sortOptions={[]} workspaceOptions={[]} />
<div class="content-details">
	{#await import('./EditableHelpDetailView.svelte') then { default: EditablePageDetailView }}
		<EditablePageDetailView {container} revisions={[container]} />
	{/await}
</div>
<footer class="content-footer">
	<div class="content-actions"></div>
</footer>
