<script lang="ts">
	import { _ } from 'svelte-i18n';
	import TaskCategoryDropdown from '$lib/components/TaskCategoryDropdown.svelte';

	export let editable = false;
	export let value: string;
</script>

<div class="label">{$_('task_category.label')}</div>
<TaskCategoryDropdown {editable} bind:value />
