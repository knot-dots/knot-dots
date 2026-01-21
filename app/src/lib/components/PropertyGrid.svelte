<script lang="ts">
	import type { Snippet } from 'svelte';
	import { createDisclosure } from 'svelte-headlessui';
	import { _ } from 'svelte-i18n';
	import ArrowDown from '~icons/flowbite/arrow-down-outline';
	import ArrowUp from '~icons/flowbite/arrow-up-outline';

	interface Props {
		categories?: Snippet;
		general?: Snippet;
		ownership?: Snippet;
		top?: Snippet;
	}

	let { categories, general, ownership, top }: Props = $props();

	const disclosure = createDisclosure();
</script>

<div class="details-section">
	<p class="label" id="properties-label">{$_('properties')}</p>

	<div class="data-grid" use:disclosure.panel>
		{#if $disclosure.expanded}
			{#if general}
				<div class="data-grid-subheading">{$_('properties.subheading.general')}</div>
				{@render general()}
			{/if}

			{#if categories}
				<div class="data-grid-subheading">{$_('properties.subheading.categories')}</div>
				{@render categories()}
			{/if}

			{#if ownership}
				<div class="data-grid-subheading">{$_('properties.subheading.ownership')}</div>
				{@render ownership()}
			{/if}
		{:else}
			{@render top?.()}
		{/if}
	</div>

	<button type="button" use:disclosure.button>
		{#if $disclosure.expanded}
			<ArrowUp /> {$_('properties.hide')}
		{:else}
			<ArrowDown /> {$_('properties.show_all')}
		{/if}
	</button>
</div>

<style>
	.label {
		color: var(--color-gray-600);
		font-size: 1.25rem;
		font-weight: 600;
		line-height: 1.25;
		margin: 0 0 1rem;
	}

	button {
		--button-border-color: var(--color-primary-700);
		--button-hover-background: var(--color-primary-700);
		--padding-x: 0.75rem;
		--padding-y: 0.5rem;

		color: var(--color-primary-700);
		display: flex;
		margin: 0.75rem auto 0;
	}

	button:hover {
		color: white;
	}
</style>
