<script lang="ts">
	import { createPopperActions } from 'svelte-popperjs';
	import { createDisclosure } from 'svelte-headlessui';
	import ChevronUpDown from '~icons/heroicons/chevron-up-down-20-solid';
	import clickOutside from '$lib/clickOutside';

	export let editable = false;
	export let label: string;
	export let options: Array<{ label: string; value: string }>;
	export let value: string[];

	const disclosure = createDisclosure({ expanded: false });

	const [popperRef, popperContent] = createPopperActions({
		placement: 'bottom-start',
		strategy: 'absolute'
	});

	const extraOpts = {
		modifiers: [{ name: 'offset', options: { offset: [0, 4] } }]
	};

	$: selected = options.filter((o) => value.includes(o.value)).map(({ label }) => label);
</script>

<div class="tabular">
	<span class="label">{label}</span>
	{#if editable}
		<div
			class="dropdown-reference"
			use:popperRef
			use:clickOutside
			on:outsideclick={() => disclosure.close()}
		>
			<button class="dropdown-button" type="button" use:disclosure.button>
				<span class="selected">
					{#each options.filter((o) => value.includes(o.value)) as selectedOption}
						<span class="value">{selectedOption.label}</span>
					{:else}
						&nbsp;
					{/each}
				</span>
				<ChevronUpDown />
			</button>
			{#if $disclosure.expanded}
				<fieldset class="dropdown-panel" use:disclosure.panel use:popperContent={extraOpts}>
					{#each options as option (option.value)}
						<label>
							<input type="checkbox" value={option.value} bind:group={value} />
							{option.label}
						</label>
					{/each}
				</fieldset>
			{/if}
		</div>
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
	button {
		border: none;
		min-width: 3rem;
		padding: 0.75rem 0.25rem 0.75rem 1rem;
	}

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
