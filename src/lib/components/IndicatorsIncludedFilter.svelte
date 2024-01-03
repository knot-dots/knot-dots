<script lang="ts">
	import { _ } from 'svelte-i18n';
	import Filter from '$lib/components/Filter.svelte';
</script>

<Filter
	key="included"
	options={[[$_('filter.all_organizational_units'), 'all-organizational-units']]}
/>
