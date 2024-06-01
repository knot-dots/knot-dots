<script lang="ts">
	import { _ } from 'svelte-i18n';
	import Filter from '$lib/components/Filter.svelte';
	import { measureTypes } from '$lib/models';
</script>

<Filter
	key="measureType"
	label={$_('measure_type')}
	options={measureTypes.options.map((o) => [$_(o), o])}
/>
