<script lang="ts">
	import { _ } from 'svelte-i18n';
	import ListBox from '$lib/components/ListBox.svelte';
	import { audience } from '$lib/models';

	export let value: string[];
</script>

<ListBox
	label={$_('audience')}
	options={audience.options.map((o) => ({ value: o, label: $_(o) }))}
	bind:value
/>
