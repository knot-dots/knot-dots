<script lang="ts">
	import type { Snippet } from 'svelte';
	import { createPopover } from 'svelte-headlessui';
	import { _ } from 'svelte-i18n';
	import { createPopperActions } from 'svelte-popperjs';
	import ArrowLeft from '~icons/flowbite/arrow-left-outline';
	import Close from '~icons/knotdots/close';
	import Ellipsis from '~icons/knotdots/ellipsis';

	interface Props {
		children: Snippet<[() => void]>;
		handleBack?: () => void;
		handleClose?: () => void;
		handleOpen?: () => void;
		isRoot: boolean;
		label: string;
		title: string;
	}

	let { children, handleBack, handleClose, handleOpen, isRoot, label, title }: Props = $props();

	let popover = createPopover({
		get label() {
			return label;
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

	function handleTriggerOpen() {
		if (!$popover.expanded) {
			handleOpen?.();
		}
	}

	function closePanel() {
		handleClose?.();
		popover.close();
	}

	function handleBackClick(event: MouseEvent) {
		event.preventDefault();
		event.stopPropagation();
		handleBack?.();
	}
</script>

<div class="dropdown" use:popperRef>
	<button class="dropdown-button" onclick={handleTriggerOpen} type="button" use:popover.button>
		<Ellipsis />
		<span class="is-visually-hidden">{label}</span>
	</button>

	{#if $popover.expanded}
		<fieldset class="dropdown-panel" use:popperContent={popperOpts} use:popover.panel>
			<p class="dropdown-panel-title">
				{#if !isRoot}
					<button class="action-button" onclick={handleBackClick} type="button">
						<ArrowLeft />
						<span class="is-visually-hidden">back</span>
					</button>
				{/if}

				<span>{title}</span>

				<button class="action-button" onclick={closePanel} type="button">
					<Close />
					<span class="is-visually-hidden">{$_('close')}</span>
				</button>
			</p>

			{@render children(closePanel)}
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
