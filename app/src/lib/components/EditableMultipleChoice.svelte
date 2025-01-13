<script lang="ts">
	import requestSubmit from '$lib/client/requestSubmit';
	import MultipleChoiceDropdown from '$lib/components/MultipleChoiceDropdown.svelte';

	export let editable = false;
	export let label: string;
	export let options: Array<{ label: string; value: string }>;
	export let value: string[];

	$: selected = options.filter((o) => value.includes(o.value)).map(({ label }) => label);
</script>

<div class="tabular">
	<span class="label">{label}</span>
	{#if editable}
		<MultipleChoiceDropdown handleChange={requestSubmit} {options} bind:value />
	{:else}
		<ul class="selected">
			{#each options.filter((o) => value.includes(o.value)) as selectedOption}
				<li class="value">{selectedOption.label}</li>
			{:else}
				<li>&nbsp;</li>
			{/each}
		</ul>
	{/if}
</div>

<style>
	.selected {
		display: block;
	}

	ul {
		padding: 0.75rem 1rem;
	}

	.value {
		display: list-item;
		list-style: none;
		padding: 0;
		text-align: left;
		text-wrap: nowrap;
	}
</style>
