<script lang="ts">
	import { _ } from 'svelte-i18n';
	import Filter from '$lib/components/Filter.svelte';
	import { indicatorTypes } from '$lib/models';

	export let initialValue = [indicatorTypes.enum['indicator_type.key']];
</script>

<Filter
	{initialValue}
	key="indicatorType"
	label={$_('indicator_type')}
	options={indicatorTypes.options.map((o) => [$_(o), o])}
/>
