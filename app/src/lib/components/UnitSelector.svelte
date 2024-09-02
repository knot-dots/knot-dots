<script lang="ts">
	import { _ } from 'svelte-i18n';
	import ListBox from '$lib/components/ListBox.svelte';
	import { units } from '$lib/models';

	export let value: string | undefined;
</script>

<div>
	<p>{$_('label.unit')}</p>
	<ListBox
		label={$_('label.unit')}
		options={units.options.map((o) => ({ value: o, label: $_(o) }))}
		bind:value
	/>
</div>
