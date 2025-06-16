<script lang="ts">
	import type { Snippet } from 'svelte';
	import { cubicInOut } from 'svelte/easing';
	import { slide } from 'svelte/transition';
	import { createDisclosure } from 'svelte-headlessui';
	import { _ } from 'svelte-i18n';
	import ArrowDown from '~icons/flowbite/arrow-down-outline';
	import ArrowUp from '~icons/flowbite/arrow-up-outline';

	interface Props {
		bottom: Snippet;
		top: Snippet;
	}

	let { bottom, top }: Props = $props();

	const disclosure = createDisclosure();

	let disclosureExpanded = $state($disclosure.expanded);
</script>

<div class="details-tab">
	<p class="section-label" id="properties-label">{$_('properties')}</p>

	<div class="data-grid" aria-labelledby="properties-label">
		{@render top()}
	</div>

	{#if $disclosure.expanded}
		<div
			class="data-grid"
			onintroend={() => {
				disclosureExpanded = true;
			}}
			onoutroend={() => {
				disclosureExpanded = false;
			}}
			transition:slide={{ duration: 125, easing: cubicInOut }}
			use:disclosure.panel
		>
			{@render bottom?.()}
		</div>
	{/if}

	<button type="button" use:disclosure.button>
		{#if disclosureExpanded}
			<ArrowUp /> {$_('properties.hide')}
		{:else}
			<ArrowDown /> {$_('properties.show_all')}
		{/if}
	</button>
</div>

<style>
	.section-label {
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
