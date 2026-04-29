<script lang="ts">
	import { _ } from 'svelte-i18n';
	import SingleChoiceDropdown from '$lib/components/SingleChoiceDropdown.svelte';
	import { type GoalType, goalType } from '$lib/models';

	interface Props {
		editable?: boolean;
		offset?: [number, number];
		value: GoalType | undefined;
	}

	let { editable = false, offset, value = $bindable() }: Props = $props();

	const options = $derived([
		{ label: $_('empty'), value: undefined },
		...goalType.options.map((o) => ({ label: $_(o), value: o }))
	]);
</script>

{#if editable}
	<SingleChoiceDropdown {offset} {options} bind:value />
{:else}
	<span class="value">{value ? $_(value) : $_('empty')}</span>
{/if}
