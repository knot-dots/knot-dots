<script lang="ts">
	import type { Snippet } from 'svelte';
	import { createDisclosure } from 'svelte-headlessui';
	import { _ } from 'svelte-i18n';
	import ArrowDown from '~icons/flowbite/arrow-down-outline';
	import ArrowUp from '~icons/flowbite/arrow-up-outline';
	import Close from '~icons/knotdots/close';
	import { getDetailViewContext } from '$lib/contexts/detailView';

	interface Props {
		categories?: Snippet;
		general?: Snippet;
		ownership?: Snippet;
		top?: Snippet;
	}

	let { categories, general, ownership, top }: Props = $props();

	const disclosure = createDisclosure();

	const detailView = getDetailViewContext();
</script>

{#if detailView && detailView.properties.open}
	<div {...detailView.properties.content} class="details-properties">
		<h2>
			{$_('properties')}
			<button {...detailView.properties.trigger} class="action-button" type="button">
				<Close />
				<span class="is-visually-hidden">{$_('close')}</span>
			</button>
		</h2>

		{#if general}
			<h3>{$_('properties.subheading.general')}</h3>
			{@render general()}
		{/if}

		{#if categories}
			<h3>{$_('properties.subheading.categories')}</h3>
			{@render categories()}
		{/if}

		{#if ownership}
			<h3>{$_('properties.subheading.ownership')}</h3>
			{@render ownership()}
		{/if}
	</div>
{:else if !detailView}
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
{/if}

<style>
	.details-section .label {
		color: var(--color-gray-600);
		font-size: 1.25rem;
		font-weight: 600;
		line-height: 1.25;
		margin: 0 0 1rem;
	}

	.details-section button {
		--button-border-color: var(--color-primary-700);
		--button-hover-background: var(--color-primary-700);
		--padding-x: 0.75rem;
		--padding-y: 0.5rem;

		color: var(--color-primary-700);
		display: flex;
		margin: 0.75rem auto 0;
	}

	.details-section button:hover {
		color: white;
	}

	.details-properties {
		--dropdown-button-border-radius: var(--form-control-border-radius);
		--dropdown-button-border-width: 1px;
		--dropdown-button-default-background: var(--form-control-background);
		--dropdown-button-min-height: var(--form-control-min-height);
		--dropdown-button-padding-y: var(--form-control-padding-y);
		--dropdown-button-padding-x: var(--form-control-padding-x);
		--dropdown-panel-max-width: 100%;
		--form-control-background: var(--color-white);

		border-radius: 8px 12px 12px 8px;
		border: 1px solid var(--color-border-subtle);
		background: var(--color-surface-container);
		height: calc(100% - 0.5rem);
		max-width: min(23.75rem, 100%);
		width: 23.75rem;
		overflow-y: auto;
		padding: 0.5rem 1rem;
		position: absolute;
		right: 0;
		top: 0;
		z-index: 1;
	}

	.details-properties h2 {
		align-items: center;
		color: var(--color-text-strong);
		display: flex;
		font-size: 1rem;
		font-weight: 500;
		justify-content: space-between;
		line-height: 1.25;
		margin-bottom: 2.5rem;
	}

	.details-properties h3 {
		color: var(--color-text-subtle);
		font-size: 0.875rem;
		font-weight: 600;
		margin-bottom: 0.625rem;
		margin-top: 2rem;
	}
</style>
