<script lang="ts">
	import { _ } from 'svelte-i18n';
	import Filter from '$lib/components/Filter.svelte';
	import { type PayloadType, payloadTypes } from '$lib/models';

	export let options: PayloadType[] = payloadTypes.options;
</script>

<Filter key="payloadType" options={options.map((o) => [$_(o), o])} />
