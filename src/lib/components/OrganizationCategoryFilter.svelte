<script lang="ts">
	import { _ } from 'svelte-i18n';
	import Filter from '$lib/components/Filter.svelte';
	import { organizationCategories } from '$lib/models';
</script>

<Filter
	key="organizationCategory"
	options={organizationCategories.options.map((o) => [$_(o), o])}
/>
