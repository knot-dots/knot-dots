<script lang="ts">
	import EditableHelpDetailView from '$lib/components/EditableHelpDetailView.svelte';
	import { type Container, type HelpPayload } from '$lib/models';

	interface Props {
		container: Container<HelpPayload>;
	}

	let { container }: Props = $props();
</script>

<EditableHelpDetailView {container} revisions={[container]} />
