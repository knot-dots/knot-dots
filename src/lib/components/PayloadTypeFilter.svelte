<script lang="ts">
	import { _ } from 'svelte-i18n';
	import Filter from '$lib/components/Filter.svelte';
	import { payloadTypes } from '$lib/models';
</script>

<Filter
	key="payloadType"
	options={[
		payloadTypes.enum.model,
		payloadTypes.enum['internal_objective.vision'],
		payloadTypes.enum.strategic_goal,
		payloadTypes.enum.operational_goal,
		payloadTypes.enum['internal_objective.milestone'],
		payloadTypes.enum.measure,
		payloadTypes.enum.text
	].map((o) => [$_(o), o])}
/>
