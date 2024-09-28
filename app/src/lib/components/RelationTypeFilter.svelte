<script lang="ts">
	import { _ } from 'svelte-i18n';
	import Filter from '$lib/components/Filter.svelte';
	import { predicates } from '$lib/models';

	export let enabledPredicates = [
		predicates.enum['is-part-of'],
		predicates.enum['is-equivalent-to'],
		predicates.enum['is-consistent-with'],
		predicates.enum['is-inconsistent-with']
	] as string[];

	const options = [
		[$_('relation_filter.option.is_part_of'), predicates.enum['is-part-of']],
		[$_('relation_filter.option.is_equivalent_to'), predicates.enum['is-equivalent-to']],
		[$_('relation_filter.option.is_consistent_with'), predicates.enum['is-consistent-with']],
		[$_('relation_filter.option.is_inconsistent_with'), predicates.enum['is-inconsistent-with']],
		[$_('relation_filter.option.is_prerequisite_for'), predicates.enum['is-prerequisite-for']],
		[$_('relation_filter.option.is_superordinate_of'), predicates.enum['is-superordinate-of']],
		[$_('relation_filter.option.contributes_to'), predicates.enum['contributes-to']]
	].filter(([, v]) => enabledPredicates.includes(v));
</script>

<Filter key="relationType" label={$_('relation_filter.label')} {options} />
