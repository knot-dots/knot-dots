<script lang="ts">
	import { _ } from 'svelte-i18n';
	import ListBox from '$lib/components/ListBox.svelte';
	import { strategyTypes } from '$lib/models';

	export let value: string | undefined;
</script>

<ListBox
	label={$_('strategy_type.label')}
	options={strategyTypes.options.map((o) => ({ value: o, label: $_(o) }))}
	bind:value
/>
