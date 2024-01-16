<script lang="ts">
	import { _ } from 'svelte-i18n';
	import Filter from '$lib/components/Filter.svelte';
	import { audience } from '$lib/models';
</script>

<Filter
	initialValue={[audience.enum['audience.public']]}
	key="audience"
	label={$_('audience')}
	options={audience.options.map((o) => [$_(o), o])}
/>
