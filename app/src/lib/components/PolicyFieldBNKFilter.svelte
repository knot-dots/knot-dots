<script lang="ts">
	import { _ } from 'svelte-i18n';
	import Filter from '$lib/components/Filter.svelte';
	import { policyFieldBNK } from '$lib/models';
</script>

<Filter
	key="policyFieldBNK"
	label={$_('policy_field_bnk')}
	options={policyFieldBNK.options.map((o) => [$_(o), o])}
/>
