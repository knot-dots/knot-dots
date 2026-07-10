<script lang="ts" module>
	import type { AnyPayload, Container } from '$lib/models';
</script>

<script lang="ts" generics="T extends Container<AnyPayload>">
	import SelectableCard from '$lib/components/SelectableCard.svelte';

	interface Props {
		onSelect?: (value: T) => void;
		options: T[];
		legend?: string;
		value?: T;
	}

	let { onSelect, options, legend = '', value }: Props = $props();

	function onchange(event: Event & { currentTarget: HTMLInputElement }) {
		onSelect?.(options.find((option) => option.guid === event.currentTarget.value)!);
	}
</script>

<fieldset class="catalog">
	{#if legend}<legend>{legend}</legend>{/if}

	{#each options as option (option.guid)}
		<SelectableCard
			checked={value?.guid === option.guid}
			container={option}
			inputType="radio"
			{onchange}
		/>
	{/each}
</fieldset>

<style>
	fieldset {
		border: none;
		padding: 0;
	}
</style>
