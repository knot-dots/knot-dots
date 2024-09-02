<script lang="ts">
	import { _ } from 'svelte-i18n';
	import ListBox from '$lib/components/ListBox.svelte';
	import { taskCategories } from '$lib/models';

	export let value: string | undefined;
</script>

<div class="meta">
	<p class="meta-key">{$_('task_category.label')}</p>
	<div class="meta-value">
		<ListBox
			label={$_('task_category.label')}
			options={taskCategories.options.map((o) => ({ value: o, label: $_(o) }))}
			bind:value
		/>
	</div>
</div>
