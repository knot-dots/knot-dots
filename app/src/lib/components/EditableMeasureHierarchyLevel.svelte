<script lang="ts">
	import { _ } from 'svelte-i18n';
	import EditableHierarchyLevel from '$lib/components/EditableHierarchyLevel.svelte';

	interface Props {
		editable?: boolean;
		value: number;
		showLabel?: boolean;
	}

	let { editable = false, showLabel = true, value = $bindable() }: Props = $props();
</script>

<EditableHierarchyLevel
	{editable}
	label={showLabel ? $_('measure.hierarchy_level') : undefined}
	bind:value
/>
