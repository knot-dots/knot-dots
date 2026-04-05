<script lang="ts">
	import { _ } from 'svelte-i18n';
	import SingleChoiceDropdown from '$lib/components/SingleChoiceDropdown.svelte';
	import { editorialState } from '$lib/models';

	interface Props {
		aiSuggestion?: boolean;
		editable?: boolean;
		labelledBy?: string;
		offset?: [number, number];
		value: string | undefined;
	}

	let {
		aiSuggestion = false,
		editable = false,
		labelledBy,
		offset,
		value = $bindable()
	}: Props = $props();
</script>

{#if editable}
	<SingleChoiceDropdown
		{labelledBy}
		{offset}
		options={[
			{ label: $_('empty'), value: undefined },
			...editorialState.options.map((o) => ({
				label: $_(o, { values: { aiSuggestion: aiSuggestion ? 'yes' : 'no' } }),
				value: o
			}))
		]}
		bind:value
	/>
{:else}
	<div class="value">
		{value ? $_(value, { values: { aiSuggestion: aiSuggestion ? 'yes' : 'no' } }) : $_('empty')}
	</div>
{/if}
