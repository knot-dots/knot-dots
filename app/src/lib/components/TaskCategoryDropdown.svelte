<script lang="ts">
	import { _ } from 'svelte-i18n';
	import SingleChoiceDropdown from '$lib/components/SingleChoiceDropdown.svelte';
	import { taskCategories } from '$lib/models';

	interface Props {
		editable?: boolean;
		labelledBy?: string;
		offset?: [number, number];
		value: string;
	}

	let { editable = false, labelledBy, offset, value = $bindable() }: Props = $props();

	let options = taskCategories.options.map((o) => ({ label: $_(o), value: o }));

	let selected = $derived(options.find((o) => o.value === value));
</script>

{#if editable}
	<SingleChoiceDropdown {labelledBy} {offset} {options} bind:value />
{:else}
	<div class="value">
		{#if selected}
			{selected.label}
		{:else}
			{$_('empty')}
		{/if}
	</div>
{/if}
