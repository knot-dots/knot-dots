<script lang="ts">
	import EditableHelpDetailView from '$lib/components/EditableHelpDetailView.svelte';
	import { type HelpContainer } from '$lib/models';

	interface Props {
		container: HelpContainer;
	}

	let { container }: Props = $props();
</script>

<EditableHelpDetailView {container} revisions={[container]} />
