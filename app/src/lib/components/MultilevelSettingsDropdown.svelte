<script lang="ts">
	import type { Snippet } from 'svelte';
	import { createPopover } from 'svelte-headlessui';
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
		panelClass?: string;
		panelMinWidth?: string;
		title: string;
	}

	let {
		children,
		handleBack,
		handleClose,
		handleOpen,
		isRoot,
		label,
		panelClass,
		panelMinWidth = '17.5rem',
		title
	}: Props = $props();

	let popover = createPopover({
		get label() {
			return label;
		}
	});

	let [popperRef, popperContent] = createPopperActions({
		placement: 'bottom-end',
		strategy: 'fixed'
	});

	const popperOpts = { modifiers: [{ name: 'offset', options: { offset: [0, 8] } }] };

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
		<fieldset
			class="dropdown-panel settings-panel {panelClass ?? ''}"
			style={`--settings-panel-min-width: ${panelMinWidth};`}
			use:popperContent={popperOpts}
			use:popover.panel
		>
			<div class="settings-header">
				{#if !isRoot}
					<button class="action-button" onclick={handleBackClick} type="button">
						<ArrowLeft />
						<span class="is-visually-hidden">back</span>
					</button>
				{/if}
				<p>{title}</p>
				<button class="action-button" onclick={closePanel} type="button">
					<Close />
					<span class="is-visually-hidden">close</span>
				</button>
			</div>

			{@render children(closePanel)}
		</fieldset>
	{/if}
</div>

<style>
	.dropdown {
		--dropdown-button-default-background: transparent;
		--dropdown-button-expanded-background: var(--color-gray-100);
		--dropdown-button-padding: 0.375rem;
		--dropdown-button-border-radius: 8px;
		--dropdown-button-icon-default-color: var(--color-gray-500);
		--dropdown-button-icon-expanded-color: var(--color-gray-700);
		--dropdown-button-chevron-display: none;
		--dropdown-panel-max-height: 30rem;

		position: relative;
		z-index: 10;
	}

	.settings-panel {
		background-color: var(--color-gray-025);
		border: 1px solid var(--color-gray-200);
		border-radius: 1rem;
		box-sizing: border-box;
		gap: 0;
		min-width: var(--settings-panel-min-width);
		max-width: min(90vw, 22rem);
		overflow: hidden;
		padding: 0.5rem;
		position: absolute;
		width: var(--settings-panel-min-width);
		z-index: 1000;
	}

	.settings-header {
		align-items: center;
		display: flex;
		justify-content: space-between;
	}

	.settings-header p {
		color: var(--color-gray-700);
		font-size: 0.75rem;
		font-weight: 600;
		margin: 0;
	}

	.settings-header .action-button {
		--button-active-background: transparent;
		--button-background: transparent;
		--button-hover-background: transparent;
		--padding-x: 0.5rem;
		--padding-y: 0.5rem;

		align-items: center;
		border: none;
		border-radius: 0.375rem;
		cursor: pointer;
		display: inline-flex;
		height: 2rem;
		justify-content: center;
		width: 2rem;
	}

	.settings-header .action-button:hover {
		background-color: var(--color-gray-100);
	}

	.settings-header .action-button > :global(svg) {
		height: 1rem;
		width: 1rem;
	}
</style>
