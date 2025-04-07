<script lang="ts">
	import { _ } from 'svelte-i18n';
	import requestSubmit from '$lib/client/requestSubmit';
	import MultipleChoiceDropdown from '$lib/components/MultipleChoiceDropdown.svelte';

	export let editable = false;
	export let label: string;
	export let options: Array<{ label: string; value: string }>;
	export let value: string[];

	$: selected = options.filter((o) => value.includes(o.value)).map(({ label }) => label);
</script>

<div class="label">{label}</div>
{#if editable}
	<MultipleChoiceDropdown handleChange={requestSubmit} {options} bind:value />
{:else}
	<ul class="value">
		{#each options.filter((o) => value.includes(o.value)) as selectedOption}
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
