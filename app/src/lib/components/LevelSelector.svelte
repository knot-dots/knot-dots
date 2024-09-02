<script lang="ts">
	import { _ } from 'svelte-i18n';
	import ListBox from '$lib/components/ListBox.svelte';
	import { levels } from '$lib/models.js';

	export let value: string | undefined;
</script>

<ListBox
	label={$_('level.label')}
	options={levels.options.map((o) => ({ value: o, label: $_(o) }))}
	bind:value
/>
