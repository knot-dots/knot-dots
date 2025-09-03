<script lang="ts">
	import { _ } from 'svelte-i18n';
	import EditableMultipleChoice from '$lib/components/EditableMultipleChoice.svelte';
	import { measureTypes } from '$lib/models';

	interface Props {
		editable?: boolean;
		value: string[];
	}

	let { editable = false, value = $bindable() }: Props = $props();
</script>

<EditableMultipleChoice
	{editable}
	label={$_('measure_type')}
	options={measureTypes.options.map((o) => ({
		label: $_(o),
		value: o
	}))}
	bind:value
/>
