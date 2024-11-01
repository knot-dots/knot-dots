<script lang="ts">
	import { _ } from 'svelte-i18n';
	import EditableSingleChoice from '$lib/components/EditableSingleChoice.svelte';
	import { levels } from '$lib/models';

	export let editable = false;
	export let value: string;
</script>

<EditableSingleChoice
	{editable}
	label={$_('level.label')}
	options={levels.options.map((o) => ({ label: $_(o), value: o }))}
	bind:value
/>
