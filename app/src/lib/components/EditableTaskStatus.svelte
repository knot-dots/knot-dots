<script lang="ts">
	import { _ } from 'svelte-i18n';
	import requestSubmit from '$lib/client/requestSubmit';
	import EditableSingleChoice from '$lib/components/EditableSingleChoice.svelte';
	import { taskStatus } from '$lib/models';

	export let editable = false;
	export let value: string;
</script>

<EditableSingleChoice
	{editable}
	label={$_('task_status.label')}
	options={taskStatus.options.map((o) => ({ value: o, label: $_(o) }))}
	bind:value
	on:change={requestSubmit}
/>
