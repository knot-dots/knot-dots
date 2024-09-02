<script lang="ts">
	import { _ } from 'svelte-i18n';
	import ListBox from '$lib/components/ListBox.svelte';
	import { indicatorTypes } from '$lib/models';

	export let value: string[];
</script>

<ListBox
	label={$_('indicator_type')}
	options={indicatorTypes.options.map((o) => ({ value: o, label: $_(o) }))}
	bind:value
/>
