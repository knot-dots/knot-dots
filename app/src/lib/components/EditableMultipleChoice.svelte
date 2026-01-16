<script lang="ts">
	import { _ } from 'svelte-i18n';
	import MultipleChoiceDropdown from '$lib/components/MultipleChoiceDropdown.svelte';

	interface Props {
		editable?: boolean;
		label: string;
		options: Array<{ label: string; value: string }>;
		value: string[];
	}

	let { editable = false, label, options, value = $bindable() }: Props = $props();
</script>

<div class="label">{label}</div>
{#if editable}
	<MultipleChoiceDropdown {options} bind:value />
{:else}
	<ul class="value">
		{#each options.filter((o) => value.includes(o.value)) as selectedOption (selectedOption.value)}
			<li>{selectedOption.label}</li>
		{:else}
			<li>{$_('empty')}</li>
		{/each}
	</ul>
{/if}

<style>
	.value {
		display: block;
	}

	.value > li {
		display: list-item;
		list-style: none;
		padding: 0;
		text-align: left;
		text-wrap: nowrap;
	}
</style>
