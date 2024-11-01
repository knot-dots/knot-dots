<script lang="ts">
	import { _ } from 'svelte-i18n';
	import EditableMultipleChoice from '$lib/components/EditableMultipleChoice.svelte';
	import { topics } from '$lib/models';

	export let editable = false;
	export let value: string[];
</script>

<EditableMultipleChoice
	{editable}
	label={$_('topic')}
	options={topics.options.map((o) => ({
		label: $_(o),
		value: o
	}))}
	bind:value
/>
