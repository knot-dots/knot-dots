<script lang="ts">
	import { _ } from 'svelte-i18n';
	import FilterDropDown from '$lib/components/FilterDropDown.svelte';
	import { page } from '$app/state';

	let options = $derived(
		page.url.pathname.endsWith('indicators')
			? ['all_organizational_units']
			: page.data.currentOrganizationalUnit
				? ['superordinate_organizational_units', 'subordinate_organizational_units']
				: ['subordinate_organizational_units']
	);
</script>

<FilterDropDown
	initialValue={page.url.pathname.endsWith('indicators')
		? undefined
		: ['subordinate_organizational_units']}
	key="included"
	options={options.map((o) => ({ label: $_(`included.options.${o}`), value: o }))}
/>
