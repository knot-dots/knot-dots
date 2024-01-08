<script lang="ts">
	import { _ } from 'svelte-i18n';
	import Filter from '$lib/components/Filter.svelte';
	import { taskCategories } from '$lib/models';
</script>

<Filter
	key="taskCategory"
	label={$_('task_category.label')}
	options={taskCategories.options.map((o) => [$_(o), o])}
/>
