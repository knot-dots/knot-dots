<script lang="ts">
	import { _ } from 'svelte-i18n';
	import Filter from '$lib/components/Filter.svelte';
	import { predicates } from '$lib/models';

	const options = [
		[$_('relation_filter.option.is_part_of'), predicates.enum['is-part-of']],
		[$_('relation_filter.option.is_equivalent_to'), predicates.enum['is-equivalent-to']],
		[$_('relation_filter.option.is_consistent_with'), predicates.enum['is-consistent-with']],
		[$_('relation_filter.option.is_inconsistent_with'), predicates.enum['is-inconsistent-with']]
	];
</script>

<Filter key="relationType" label={$_('relation_filter.label')} {options} />
