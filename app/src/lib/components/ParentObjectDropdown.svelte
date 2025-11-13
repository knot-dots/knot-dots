<script lang="ts">
	import EditableParent from '$lib/components/EditableParent.svelte';
	import type { Container } from '$lib/models';

	interface Props {
		editable?: boolean;
		container: Container;
	}

	let { editable = false, container = $bindable() }: Props = $props();
</script>

<EditableParent {editable} bind:container hideLabel={true} />
