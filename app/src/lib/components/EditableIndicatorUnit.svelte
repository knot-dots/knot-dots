<script lang="ts">
	import { _ } from 'svelte-i18n';
	import EditableSingleChoice from '$lib/components/EditableSingleChoice.svelte';
	import { units } from '$lib/models';

	interface Props {
		editable?: boolean;
		value: string;
	}

	let { editable = false, value = $bindable() }: Props = $props();
</script>

<EditableSingleChoice
	{editable}
	label={$_('label.unit')}
	options={units.options.map((o) => ({ value: o, label: $_(o) }))}
	bind:value
/>
