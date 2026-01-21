<script lang="ts">
	import { _ } from 'svelte-i18n';
	import TaskStatusDropdown from '$lib/components/TaskStatusDropdown.svelte';
	import type { TaskStatus } from '$lib/models';

	interface Props {
		editable?: boolean;
		value: TaskStatus;
	}

	let { editable = false, value = $bindable() }: Props = $props();

	const id = crypto.randomUUID();
</script>

<div class="label" {id}>{$_('task_status.label')}</div>
<TaskStatusDropdown {editable} labelledBy={id} bind:value />
