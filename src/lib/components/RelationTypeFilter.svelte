<script lang="ts">
	import { _ } from 'svelte-i18n';
	import Filter from '$lib/components/Filter.svelte';
</script>

<Filter
	key="relationType"
	label={$_('relation_filter.label')}
	options={[
		[$_('relation_filter.hierarchical'), 'hierarchical'],
		[$_('relation_filter.other'), 'other']
	]}
/>
