<script lang="ts">
	import { _ } from 'svelte-i18n';
	import Filter from '$lib/components/Filter.svelte';
	import { page } from '$app/stores';

	$: options = $page.data.currentOrganizationalUnit
		? ['superordinate_organizational_units', 'subordinate_organizational_units']
		: ['subordinate_organizational_units'];
</script>

<Filter
	initialValue={['subordinate_organizational_units']}
	key="included"
	label={$_('included.label')}
	options={options.map((o) => [$_(`included.options.${o}`), o])}
/>
