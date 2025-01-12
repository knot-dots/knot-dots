<script lang="ts">
	import { createPopover } from 'svelte-headlessui';
	import { createPopperActions } from 'svelte-popperjs';
	import ChevronUpDown from '~icons/heroicons/chevron-up-down-20-solid';

	export let editable = false;
	export let label: string;
	export let options: Array<{ href?: string; label: string; value: string | undefined }>;
	export let value: string | undefined;

	const popover = createPopover({});

	const [popperRef, popperContent] = createPopperActions({
		placement: 'bottom-start',
		strategy: 'absolute'
	});

	const extraOpts = {
		modifiers: [{ name: 'offset', options: { offset: [0, 4] } }]
	};

	$: selected = options.find((o) => o.value == value);
</script>

<div class="tabular">
	<span class="label">{label}</span>
	{#if editable}
		<div class="dropdown-reference" use:popperRef>
			<button class="dropdown-button" type="button" use:popover.button>
				{#if selected}{selected.label}{:else}&nbsp;{/if}<ChevronUpDown />
			</button>
			{#if $popover.expanded}
				<fieldset class="dropdown-panel" use:popover.panel use:popperContent={extraOpts}>
					{#each options as option (option.value)}
						<label>
							<input type="radio" value={option.value} bind:group={value} on:change />
							{option.label}
						</label>
					{/each}
				</fieldset>
			{/if}
		</div>
	{:else}
		<span class="value">
			{#if selected}
				{#if selected.href}
					<a href={selected.href}>{selected.label}</a>
				{:else}
					{selected.label}
				{/if}
			{:else}
				&nbsp;
			{/if}
		</span>
	{/if}
</div>

<style>
	button {
		border: none;
		padding: 0.75rem 0.25rem 0.75rem 1rem;
	}
</style>
