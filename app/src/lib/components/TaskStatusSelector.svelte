<script lang="ts">
	import { _ } from 'svelte-i18n';
	import ListBox from '$lib/components/ListBox.svelte';
	import { taskStatus } from '$lib/models';

	export let value: string | undefined;
</script>

<div class="meta">
	<p class="meta-key">{$_('task_status.label')}</p>
	<div class="meta-value">
		<ListBox
			label={$_('task_status.label')}
			options={taskStatus.options.map((o) => ({ value: o, label: $_(o) }))}
			bind:value
		/>
	</div>
</div>
