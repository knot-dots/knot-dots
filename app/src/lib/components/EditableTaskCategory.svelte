<script lang="ts">
	import { _ } from 'svelte-i18n';
	import requestSubmit from '$lib/client/requestSubmit';
	import EditableSingleChoice from '$lib/components/EditableSingleChoice.svelte';
	import { taskCategories } from '$lib/models';

	export let editable = false;
	export let value: string;
</script>

<EditableSingleChoice
	{editable}
	label={$_('task_category.label')}
	options={taskCategories.options.map((o) => ({
		label: $_(o),
		value: o
	}))}
	bind:value
	on:change={requestSubmit}
/>
