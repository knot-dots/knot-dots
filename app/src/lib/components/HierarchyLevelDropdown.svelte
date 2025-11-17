<script lang="ts">
	import SingleChoiceDropdown from '$lib/components/SingleChoiceDropdown.svelte';

	interface Props {
		editable?: boolean;
		value: number;
	}

	let { editable = false, value = $bindable() }: Props = $props();

	function setLevel(v: string | null | undefined) {
		if (v == null) return; // ignore null (no selection retained)
		const n = Number(v);
		if (!Number.isNaN(n) && n !== value) value = n;
	}

	const options = $derived(
		Array.from({ length: 6 }, (_, i) => {
			const v = String(i + 1);
			return { label: v, value: v };
		})
	);
</script>

{#if editable}
	<SingleChoiceDropdown offset={[0, -39]} {options} bind:value={() => String(value), setLevel} />
{:else}
	<span class="value">{value}</span>
{/if}
