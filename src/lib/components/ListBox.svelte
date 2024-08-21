<script lang="ts">
	import { fade } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import { createListbox } from 'svelte-headlessui';
	import { createPopperActions } from 'svelte-popperjs';
	import { _ } from 'svelte-i18n';
	import Check from '~icons/heroicons/check-20-solid';
	import ChevronUpDown from '~icons/heroicons/chevron-up-down-20-solid';
	import XMark from '~icons/heroicons/x-mark-20-solid';

	export let label: string;
	export let options: string[] = [];
	export let required = false;
	export let value: string[] = [];

	const listbox = createListbox({
		label,
		selected: value
	});

	const [popperRef, popperContent] = createPopperActions({
		placement: 'bottom',
		strategy: 'absolute'
	});

	const extraOpts = {
		modifiers: [{ name: 'offset', options: { offset: [0, 4] } }]
	};

	$: value = $listbox.selected;
</script>

<div>
	<p>{$_(label)}</p>

	<button
		class:invalid={required && value.length === 0}
		class:valid={!required || value.length > 0}
		use:listbox.button
		use:popperRef
	>
		<ul class="selected">
			{#each $listbox.selected as selected (selected)}
				<li>
					<span>{$_(selected)}</span>
					<span use:listbox.deselect={selected}>
						<XMark />
					</span>
				</li>
			{/each}
		</ul>
		<ChevronUpDown />
	</button>

	{#if $listbox.expanded}
		<ul
			class="focus-indicator options"
			out:fade={{ duration: 100, easing: cubicOut }}
			use:listbox.items
			use:popperContent={extraOpts}
		>
			{#each options as option (option)}
				{@const active = $listbox.active === option}
				{@const selected = $listbox.selected.includes(option)}
				<li class:active use:listbox.item={{ value: option }}>
					{$_(option)}
					{#if selected}
						<Check />
					{/if}
				</li>
			{/each}
		</ul>
	{/if}
</div>

<style>
	div {
		position: relative;
	}

	button {
		--button-active-background: var(--color-gray-050);
		--button-border-color: var(--color-gray-300);
		--button-background: var(--color-gray-050);
		--button-hover-background: var(--color-gray-050);

		display: flex;
		justify-content: space-between;
		min-height: calc(2 * 0.75rem + 1.2rem + 2px);
		padding: 0.5rem 0.625rem;
		width: 100%;
	}

	button :global(> :last-child) {
		flex-shrink: 0;
	}

	.selected {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		overflow: hidden;
	}

	.selected > li {
		align-items: center;
		border: solid 1px;
		border-radius: 0.375rem;
		display: inline-flex;
		justify-content: center;
		gap: 0.25rem;
		overflow: hidden;
		padding: 0 0.25rem 0 0.5rem;
		text-align: center;
	}

	.selected > li > :first-child {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.selected > li > :last-child {
		flex-shrink: 0;
	}

	.options {
		background-color: white;
		border: solid 1px var(--color-gray-900);
		border-radius: 8px;
		cursor: default;
		max-height: 17.125rem;
		overflow-y: auto;
		padding: 0.5rem;
		width: 100%;
		z-index: 1;
	}

	.options > li {
		align-items: center;
		border-radius: 0.5rem;
		display: flex;
		justify-content: space-between;
		padding: 0.375rem 0.5rem;
	}

	.options > li.active {
		background-color: var(--focus-color);
		color: white;
		outline: none;
	}

	.invalid {
		background-color: var(--color-red-050);
		border-color: var(--color-red-500);
		color: var(--color-red-700);
	}
</style>
