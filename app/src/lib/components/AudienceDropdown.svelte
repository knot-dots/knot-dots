<script lang="ts">
	import { _ } from 'svelte-i18n';
	import requestSubmit from '$lib/client/requestSubmit';
	import MultipleChoiceDropdown from '$lib/components/MultipleChoiceDropdown.svelte';
	import { audience } from '$lib/models';

	interface Props {
		editable?: boolean;
		value: string[];
	}

	let { editable = false, value = $bindable() }: Props = $props();
</script>

{#if editable}
	<MultipleChoiceDropdown
		handleChange={requestSubmit}
		options={audience.options.map((o) => ({ value: o, label: $_(o) }))}
		bind:value
	/>
{:else if value.length > 0}
	<p class="truncated">
		{value.map((a) => $_(a)).join(', ')}
	</p>
{/if}
