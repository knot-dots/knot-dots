<script lang="ts">
	import SingleChoiceDropdown from '$lib/components/SingleChoiceDropdown.svelte';

	interface Props {
		editable?: boolean;
		value: number;
	}

	let { editable = false, value = $bindable() }: Props = $props();

	// Internal string value to interop with SingleChoiceDropdown (expects string/null/undefined)
	let internal = $state(String(value));

	// Keep internal in sync when external value changes
	$effect(() => {
		internal = String(value);
	});

	// Propagate changes back as number
	$effect(() => {
		const n = Number(internal);
		if (!Number.isNaN(n) && n !== value) value = n;
	});

	const options = $derived(
		Array.from({ length: 6 }, (_, i) => {
			const v = String(i + 1);
			return { label: v, value: v };
		})
	);
</script>

{#if editable}
	<SingleChoiceDropdown offset={[0, -39]} {options} bind:value={internal} />
{:else}
	<span class="value">{value}</span>
{/if}
