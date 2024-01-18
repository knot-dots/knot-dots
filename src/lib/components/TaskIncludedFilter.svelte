<script lang="ts">
	import { _ } from 'svelte-i18n';
	import Filter from '$lib/components/Filter.svelte';
</script>

<Filter
	key="included"
	options={[
		[$_('internal_objective_filter.include_measures'), 'is-part-of-measure'],
		[
			$_('internal_objective_filter.include_subordinate_organizational_units'),
			'subordinate-organizational-units'
		]
	]}
/>
