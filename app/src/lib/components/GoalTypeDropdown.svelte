<script lang="ts">
	import { _ } from 'svelte-i18n';
	import SingleChoiceDropdown from '$lib/components/SingleChoiceDropdown.svelte';
	import { type GoalType, goalType } from '$lib/models';

	interface Props {
		editable?: boolean;
		value: GoalType | undefined;
	}

	let { editable = false, value = $bindable() }: Props = $props();

	function setGoalType(v: string | null | undefined) {
		value = (v ?? undefined) as GoalType | undefined;
	}

	const options = $derived([
		{ label: $_('empty'), value: null },
		...goalType.options.map((o) => ({ label: $_(o), value: o }))
	]);
</script>

{#if editable}
	<SingleChoiceDropdown offset={[0, -39]} {options} bind:value={() => value ?? null, setGoalType} />
{:else}
	<span class="value">{value ? $_(value) : $_('empty')}</span>
{/if}
