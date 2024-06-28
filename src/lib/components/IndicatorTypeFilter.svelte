<script lang="ts">
	import { _ } from 'svelte-i18n';
	import Filter from '$lib/components/Filter.svelte';
	import { indicatorTypes } from '$lib/models';
</script>

<Filter
	key="indicatorType"
	label={$_('indicator_type')}
	options={indicatorTypes.options.map((o) => [$_(o), o])}
/>
