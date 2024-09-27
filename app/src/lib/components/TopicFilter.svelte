<script lang="ts">
	import { _ } from 'svelte-i18n';
	import Filter from '$lib/components/Filter.svelte';
	import { topics } from '$lib/models';
</script>

<Filter key="topic" label={$_('topic')} options={topics.options.map((o) => [$_(o), o])} />
