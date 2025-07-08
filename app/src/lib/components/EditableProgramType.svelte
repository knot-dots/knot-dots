<script lang="ts">
	import { _ } from 'svelte-i18n';
	import EditableSingleChoice from '$lib/components/EditableSingleChoice.svelte';
	import { programTypes } from '$lib/models';

	export let editable = false;
	export let value: string;
</script>

<EditableSingleChoice
	{editable}
	label={$_('program_type.label')}
	options={programTypes.options.map((o) => ({ label: $_(o), value: o }))}
	bind:value
/>
