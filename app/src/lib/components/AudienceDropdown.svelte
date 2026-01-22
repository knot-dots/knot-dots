<script lang="ts">
	import { _ } from 'svelte-i18n';
	import MultipleChoiceDropdown from '$lib/components/MultipleChoiceDropdown.svelte';
	import { audience } from '$lib/models';

	interface Props {
		compact?: boolean;
		editable?: boolean;
		labelledBy?: string;
		value: string[];
	}

	let { compact = false, editable = false, labelledBy, value = $bindable() }: Props = $props();
</script>

{#if editable}
	<MultipleChoiceDropdown
		{compact}
		{labelledBy}
		offset={[-41, -39]}
		options={audience.options.map((o) => ({ value: o, label: $_(o) }))}
		bind:value
	/>
{:else if value.length > 0}
	<p class="truncated">
		{value.map((a) => $_(a)).join(', ')}
	</p>
{/if}
