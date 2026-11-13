<script lang="ts">
	import type { Snippet } from 'svelte';
	import { createPopover } from 'svelte-headlessui';
	import { _ } from 'svelte-i18n';
	import { createPopperActions } from 'svelte-popperjs';
	import ArrowLeft from '~icons/flowbite/arrow-left-outline';
	import Ellipsis from '~icons/flowbite/dots-horizontal-outline';
	import Close from '~icons/knotdots/close';

	interface Props {
		children: Snippet<[string, (title: string) => void, () => void]>;
		// fixed keeps the panel out of scrolling (clipping) containers
		strategy?: 'absolute' | 'fixed';
		title: string;
	}

	let { children, strategy = 'absolute', title }: Props = $props();

	let subMenuOpen = $state(false);

	let subMenuTitle = $state('');

	let popover = createPopover({
		get label() {
			return title;
		}
	});

	// The strategy stays the same for the life of the menu.
	// svelte-ignore state_referenced_locally
	let [popperRef, popperContent] = createPopperActions({
		placement: 'bottom-end',
		strategy
	});

	const popperOpts = {
		modifiers: [
			{ name: 'offset', options: { offset: [0, 8] } },
			{ name: 'flip', options: { fallbackPlacements: ['left-start', 'top-end'] } }
		]
	};

	function openSubMenu(title: string) {
		subMenuTitle = title;
		subMenuOpen = true;
	}

	function closeSubMenu() {
		subMenuTitle = '';
		subMenuOpen = false;
	}

	let button = $state<HTMLButtonElement>();

	// Esc closes the menu from anywhere in it, not only from its button, and gives the focus back
	// to the button.
	function closeOnEscape(event: KeyboardEvent) {
		if (event.key !== 'Escape') {
			return;
		}
		event.preventDefault();
		event.stopPropagation();
		popover.close();
		button?.focus();
	}

	$effect(() => {
		if (!$popover.expanded) {
			closeSubMenu();
		}
	});
</script>

<div class="dropdown" use:popperRef>
	<button bind:this={button} class="dropdown-button" type="button" use:popover.button>
		<Ellipsis />
	</button>

	{#if $popover.expanded}
		<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
		<fieldset
			class="dropdown-panel"
			onkeydown={closeOnEscape}
			use:popperContent={popperOpts}
			use:popover.panel
		>
			<p class="dropdown-panel-title">
				{#if subMenuOpen}
					<button class="action-button" onclick={closeSubMenu} type="button">
						<ArrowLeft />
						<span class="is-visually-hidden">back</span>
					</button>
				{/if}

				<span>{subMenuOpen ? subMenuTitle : title}</span>

				<button class="action-button" onclick={popover.close} type="button">
					<Close />
					<span class="is-visually-hidden">{$_('close')}</span>
				</button>
			</p>

			{@render children(subMenuTitle, openSubMenu, popover.close)}
		</fieldset>
	{/if}
</div>

<style>
	.dropdown {
		--dropdown-button-default-background: transparent;
		--dropdown-button-icon-size: 1.25rem;
		--dropdown-button-padding: 0.375rem;
		--dropdown-panel-background: var(--color-surface-container);
		--dropdown-panel-border-color: var(--color-border-raised);
		--dropdown-panel-border-radius: 16px;
		--dropdown-panel-gap: 0;
		--dropdown-panel-max-height: 30rem;
		--dropdown-panel-width: 20rem;
	}

	.dropdown-panel-title {
		align-items: center;
		color: var(--color-text-default);
		display: flex;
		font-size: 0.75rem;
		font-weight: 600;
	}

	.dropdown-panel-title > span {
		margin-right: auto;
		padding-left: 0.5rem;
	}
</style>
