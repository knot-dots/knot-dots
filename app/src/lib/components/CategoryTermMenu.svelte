<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { createPopover } from 'svelte-headlessui';
	import { createPopperActions } from 'svelte-popperjs';
	import Ellipsis from '~icons/knotdots/ellipsis';
	import TrashBin from '~icons/flowbite/trash-bin-outline';

	interface Props {
		disabled?: boolean;
		onRemove: () => void | Promise<void>;
	}

	let { disabled = false, onRemove }: Props = $props();

	let popover = createPopover({ label: $_('category.terms.remove_button') });

	let [popperRef, popperContent] = createPopperActions({
		placement: 'bottom-end',
		strategy: 'absolute'
	});

	const extraOpts = { modifiers: [{ name: 'offset', options: { offset: [0, 4] } }] };
</script>

<div
	class="actions is-visible-on-hover category-terms__actions category-terms__actions--right"
	use:popperRef
>
	<button
		class="dropdown-button category-terms__menu-button"
		type="button"
		{disabled}
		aria-label={$_('category.terms.remove_button')}
		use:popover.button
	>
		<Ellipsis />
	</button>

	{#if $popover.expanded}
		<fieldset
			class="dropdown-panel category-terms__menu-panel"
			use:popperContent={extraOpts}
			use:popover.panel
		>
			<button
				class="action-button action-button--padding-tight"
				type="button"
				onclick={() => {
					popover.close();
					void onRemove();
				}}
				{disabled}
			>
				<TrashBin />
				<span>{$_('category.terms.remove_button')}</span>
			</button>
		</fieldset>
	{/if}
</div>

<style>
	.category-terms__actions {
		--dropdown-button-icon-default-color: var(--color-gray-700);
		--dropdown-button-icon-size: 1rem;

		align-items: center;
		background: transparent;
		box-shadow: none;
		display: flex;
		gap: 0.25rem;
		padding: 0;
		position: absolute;
		top: 0.5rem;
		z-index: 1;
	}

	.category-terms__actions--right {
		left: auto;
		right: 0.5rem;
		width: max-content;
	}

	.category-terms__menu-button {
		align-items: center;
		background: transparent;
		border-radius: 8px;
		border: none;
		box-shadow: none;
		display: inline-flex;
		height: 2rem;
		justify-content: center;
		padding: 0.25rem 0.4rem;
		width: 2rem;
		outline: none;
	}

	.category-terms__menu-button:focus-visible {
		outline: none;
		box-shadow: none;
	}

	.category-terms__menu-button :global(svg) {
		height: 1rem;
		width: 1rem;
	}

	.category-terms__menu-panel {
		background: white;
		border: 1px solid var(--color-gray-200);
		border-radius: 12px;
		box-shadow: var(--shadow-md);
		min-width: 10rem;
		position: absolute;
		right: 0;
		top: calc(100% + 0.25rem);
		padding: 0.25rem;
	}

	.category-terms__menu-panel .action-button {
		align-items: center;
		color: var(--color-red-600);
		display: flex;
		gap: 0.35rem;
		padding: 0.5rem 0.75rem;
		width: 100%;
	}
</style>
