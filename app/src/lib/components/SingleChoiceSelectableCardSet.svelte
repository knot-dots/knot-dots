<script lang="ts" module>
	import type { AnyPayload, Container } from '$lib/models';
</script>

<script lang="ts" generics="T extends Container<AnyPayload>">
	import type { Snippet } from 'svelte';
	import SelectableCard from '$lib/components/SelectableCard.svelte';

	interface Props {
		leading?: Snippet;
		onSelect?: (value: T) => void;
		optionBody?: Snippet<[T]>;
		optionFooter?: Snippet<[T]>;
		options: T[];
		legend?: string;
		value?: T;
	}

	let {
		leading,
		onSelect,
		optionBody,
		optionFooter,
		options,
		legend = '',
		value
	}: Props = $props();

	function onchange(event: Event & { currentTarget: HTMLInputElement }) {
		onSelect?.(options.find((option) => option.guid === event.currentTarget.value)!);
	}
</script>

<fieldset class="catalog">
	{#if legend}<legend>{legend}</legend>{/if}

	{@render leading?.()}

	{#each options as option (option.guid)}
		{#snippet body()}
			{@render optionBody?.(option)}
		{/snippet}
		{#snippet footer()}
			{@render optionFooter?.(option)}
		{/snippet}
		<SelectableCard
			body={optionBody ? body : undefined}
			checked={value?.guid === option.guid}
			container={option}
			footer={optionFooter ? footer : undefined}
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
