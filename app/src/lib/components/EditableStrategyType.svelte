<script lang="ts">
	import { _ } from 'svelte-i18n';
	import requestSubmit from '$lib/client/requestSubmit';
	import EditableSingleChoice from '$lib/components/EditableSingleChoice.svelte';
	import { strategyTypes } from '$lib/models';

	export let editable = false;
	export let value: string;
</script>

<EditableSingleChoice
	{editable}
	label={$_('strategy_type.label')}
	options={strategyTypes.options.map((o) => ({ label: $_(o), value: o }))}
	bind:value
	on:change={requestSubmit}
/>
