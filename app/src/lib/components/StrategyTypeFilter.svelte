<script lang="ts">
	import { _ } from 'svelte-i18n';
	import Filter from '$lib/components/Filter.svelte';
	import { strategyTypes } from '$lib/models';
</script>

<Filter
	key="strategyType"
	label={$_('strategy_type.label')}
	options={strategyTypes.options.map((o) => [$_(o), o])}
/>
