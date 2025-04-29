<script lang="ts">
	import { _ } from 'svelte-i18n';
	import EditableSingleChoice from '$lib/components/EditableSingleChoice.svelte';
	import { goalType } from '$lib/models';

	export let editable = false;
	export let value: string | undefined;
</script>

<EditableSingleChoice
	{editable}
	label={$_('goal_type')}
	options={[
		{ label: $_('empty'), value: undefined },
		...goalType.options.map((o) => ({ label: $_(o), value: o }))
	]}
	bind:value
/>
