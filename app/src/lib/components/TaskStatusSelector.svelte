<script lang="ts">
	import { _ } from 'svelte-i18n';
	import ListBox from '$lib/components/ListBox.svelte';
	import { taskStatus } from '$lib/models';

	export let value: string | undefined;
</script>

<ListBox
	label={$_('task_status.label')}
	options={taskStatus.options.map((o) => ({ value: o, label: $_(o) }))}
	bind:value
/>
