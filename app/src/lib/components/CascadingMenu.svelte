<script lang="ts">
	import type { Snippet } from 'svelte';
	import { createPopover } from 'svelte-headlessui';
	import { _ } from 'svelte-i18n';
	import { createPopperActions } from 'svelte-popperjs';
	import ArrowLeft from '~icons/flowbite/arrow-left-outline';
	import Close from '~icons/knotdots/close';
	import Ellipsis from '~icons/knotdots/ellipsis';

	interface Props {
		children: Snippet<[string, (title: string) => void, () => void]>;
		title: string;
	}

	let { children, title }: Props = $props();

	let subMenuOpen = $state(false);

	let subMenuTitle = $state('');

	let popover = createPopover({
		get label() {
			return title;
		}
	});

	let [popperRef, popperContent] = createPopperActions({
		placement: 'bottom-end',
		strategy: 'absolute'
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

	$effect(() => {
		if (!$popover.expanded) {
			closeSubMenu();
		}
	});
</script>

<div class="dropdown" use:popperRef>
	<button class="dropdown-button" type="button" use:popover.button>
		<Ellipsis />
	</button>

	{#if $popover.expanded}
		<fieldset class="dropdown-panel" use:popperContent={popperOpts} use:popover.panel>
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
		--dropdown-panel-background: var(--color-surface-container);
		--dropdown-panel-border-color: var(--color-border-raised);
		--dropdown-panel-border-radius: 16px;
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
