<script lang="ts">
	import { _ } from 'svelte-i18n';
	import Filter from '$lib/components/Filter.svelte';
	import { indicatorCategories } from '$lib/models';
</script>

<Filter
	label={$_('indicator_category')}
	key="indicatorCategory"
	options={indicatorCategories.options.map((o) => [$_(o), o])}
/>
