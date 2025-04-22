<script lang="ts">
	import { _ } from 'svelte-i18n';
	import EditableSingleChoice from '$lib/components/EditableSingleChoice.svelte';
	import { editorialState } from '$lib/models';

	interface Props {
		editable?: boolean;
		value: string | undefined;
	}

	let { editable = false, value = $bindable() }: Props = $props();
</script>

<EditableSingleChoice
	{editable}
	label={$_('editorial_state')}
	options={[
		{ label: $_('empty'), value: undefined },
		...editorialState.options.map((o) => ({ label: $_(o), value: o }))
	]}
	bind:value
/>
