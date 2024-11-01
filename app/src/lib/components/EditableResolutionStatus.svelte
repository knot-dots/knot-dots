<script lang="ts">
	import { _ } from 'svelte-i18n';
	import EditableSingleChoice from '$lib/components/EditableSingleChoice.svelte';
	import { resolutionStatus } from '$lib/models';

	export let editable = false;
	export let value: string;
</script>

<EditableSingleChoice
	{editable}
	label={$_('resolution_status')}
	options={resolutionStatus.options.map((o) => ({ value: o, label: $_(o) }))}
	bind:value
/>
