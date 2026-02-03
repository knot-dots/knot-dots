<script lang="ts">
	import EditableHelpDetailView from '$lib/components/EditableHelpDetailView.svelte';
	import Header from '$lib/components/Header.svelte';
	import { type HelpContainer } from '$lib/models';

	interface Props {
		container: HelpContainer;
	}

	let { container }: Props = $props();
</script>

<Header sortOptions={[]} workspaceOptions={[]} />

<EditableHelpDetailView {container} revisions={[container]} />

<footer class="content-footer">
	<div class="content-actions"></div>
</footer>
