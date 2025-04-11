<script lang="ts">
	import { _ } from 'svelte-i18n';
	import EditableSingleChoice from '$lib/components/EditableSingleChoice.svelte';
	import { visibility } from '$lib/models';

	export let editable = false;
	export let value: string;
</script>

<EditableSingleChoice
	{editable}
	label={$_('visibility.label')}
	options={visibility.options.map((o) => ({ label: $_(`visibility.${o}`), value: o }))}
	bind:value
/>
