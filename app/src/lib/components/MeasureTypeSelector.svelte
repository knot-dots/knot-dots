<script lang="ts">
	import { _ } from 'svelte-i18n';
	import ListBox from '$lib/components/ListBox.svelte';
	import { measureTypes } from '$lib/models';

	export let value: string[];
</script>

<ListBox
	label={$_('measure_type')}
	options={measureTypes.options.map((o) => ({ value: o, label: $_(o) }))}
	bind:value
/>
