<script lang="ts">
	import { _ } from 'svelte-i18n';
	import EditableSingleChoice from '$lib/components/EditableSingleChoice.svelte';
	import { measureTypes } from '$lib/models';
	import type { MeasureType } from '$lib/models';

	interface Props {
		editable?: boolean;
		value?: MeasureType[];
	}

	let { editable = false, value = $bindable([]) }: Props = $props();

	const selected = $derived(value?.[0]);

	function handleChange(event: Event) {
		const target = event.target as HTMLInputElement | null;
		const next = (target?.value || undefined) as MeasureType | undefined;
		value = next ? [next] : [];
	}
</script>

<EditableSingleChoice
	{editable}
	label={$_('measure_type')}
	options={[
		{ label: $_('empty'), value: undefined },
		...measureTypes.options.map((o) => ({
			label: $_(o),
			value: o
		}))
	]}
	value={selected}
	on:change={handleChange}
/>
