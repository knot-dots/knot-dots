<script lang="ts">
	import { _ } from 'svelte-i18n';
	import Filter from '$lib/components/Filter.svelte';
	import { sustainableDevelopmentGoals } from '$lib/models';
</script>

<Filter
	key="category"
	label={$_('category')}
	options={sustainableDevelopmentGoals.options.map((o) => [$_(o), o])}
/>
