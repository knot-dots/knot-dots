<script lang="ts">
	import { _ } from 'svelte-i18n';
	import TaskCategoryDropdown from '$lib/components/TaskCategoryDropdown.svelte';

	interface Props {
		editable?: boolean;
		value: string;
	}

	let { editable = false, value = $bindable() }: Props = $props();

	const id = crypto.randomUUID();
</script>

<div class="label" {id}>{$_('task_category.label')}</div>
<TaskCategoryDropdown {editable} labelledBy={id} bind:value />
