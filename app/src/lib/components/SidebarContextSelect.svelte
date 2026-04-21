<script lang="ts">
	import { type Snippet } from 'svelte';
	import { cubicInOut } from 'svelte/easing';
	import { slide } from 'svelte/transition';
	import { createPopover } from 'svelte-headlessui';
	import { _ } from 'svelte-i18n';
	import Close from '~icons/flowbite/close-outline';
	import ChevronRight from '~icons/flowbite/chevron-right-outline';
	import ChevronSort from '~icons/knotdots/chevron-sort';
	import Relation from '~icons/knotdots/relation';
	import { page } from '$app/state';
	import {
		getOrganizationURL,
		type OrganizationalUnitContainer,
		type OrganizationContainer
	} from '$lib/models';
	import { env } from '$env/dynamic/public';

	interface Props {
		defaultOrganization?: OrganizationContainer;
		options: (OrganizationContainer | OrganizationalUnitContainer)[];
		title: string;
		onselect?: () => void;
		children: Snippet;
	}

	let { defaultOrganization, options, title, onselect, children }: Props = $props();

	const popover = createPopover({});

	$effect(() => {
		popover.set({ label: title });
	});

	$effect.pre(() => {
		if (page.url) {
			popover.close();
		}
	});

	let buttonEl: HTMLButtonElement | undefined = $state();
	let panelEl: HTMLDivElement | undefined = $state();
	let popoverPosition = $state({ top: 0, left: 0, minWidth: 0 });

	function updatePosition() {
		if (buttonEl) {
			const rect = buttonEl.getBoundingClientRect();
			popoverPosition = {
				top: rect.bottom + 4,
				left: rect.left,
				minWidth: rect.width
			};
		}
	}

	$effect(() => {
		if ($popover.expanded) {
			updatePosition();

			const onScroll = (e: Event) => {
				if (panelEl && e.target instanceof Node && panelEl.contains(e.target)) return;
				popover.close();
			};
			window.addEventListener('scroll', onScroll, { capture: true });
			return () => window.removeEventListener('scroll', onScroll, { capture: true });
		}
	});

	function pathnameWithoutContextSegment() {
		const pathnameSegments = page.url.pathname.split('/');
		const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
		if (pathnameSegments.length > 1 && uuidRegex.test(pathnameSegments[1])) {
			return [pathnameSegments.slice(0, 1), ...pathnameSegments.slice(2)].join('/');
		} else {
			return page.url.pathname;
		}
	}

	function optionURL(container: OrganizationContainer | OrganizationalUnitContainer) {
		return getOrganizationURL(container, pathnameWithoutContextSegment(), env).toString();
	}

	function handleButtonClick() {
		onselect?.();
	}
</script>

<div class="context-select">
	<button
		class="context-select-button"
		bind:this={buttonEl}
		onclick={handleButtonClick}
		type="button"
		use:popover.button
	>
		{@render children()}
		{#if options.length > 0}
			<ChevronSort />
		{/if}
	</button>

	{#if $popover.expanded && options.length > 0}
		<div
			bind:this={panelEl}
			class="context-select-popover"
			style="top: {popoverPosition.top}px; left: {popoverPosition.left}px; min-width: {popoverPosition.minWidth}px;"
			transition:slide={{ duration: 125, easing: cubicInOut }}
			use:popover.panel
		>
			<div class="context-select-header">
				<span class="context-select-title">{title}</span>
				<button class="context-select-close" onclick={() => popover.close()} type="button">
					<Close />
					<span class="is-visually-hidden">{$_('close')}</span>
				</button>
			</div>
			<ul class="context-select-list">
				{#each options as option (option.guid)}
					<li>
						<a class="context-select-option" href={optionURL(option)}>
							{option.payload.name}
						</a>
					</li>
				{/each}
			</ul>
			{#if defaultOrganization}
				<a class="context-select-footer" href={optionURL(defaultOrganization)}>
					<Relation />
					<span class="context-select-footer-label">{defaultOrganization.payload.name}</span>
					<ChevronRight />
				</a>
			{/if}
		</div>
	{/if}
</div>

<style>
	.context-select {
		display: flex;
		flex: 1 0 0;
		min-width: 0;
	}

	.context-select-button {
		align-items: center;
		background: none;
		border: none;
		border-radius: 8px;
		color: inherit;
		cursor: pointer;
		display: flex;
		flex: 1 0 0;
		gap: 0.375rem;
		height: 2.25rem;
		min-width: 0;
		padding: 0 0.5rem;
	}

	.context-select-button:hover {
		background-color: rgba(0, 0, 0, 0.04);
	}

	.context-select-button :global(svg) {
		color: inherit;
		flex-shrink: 0;
		height: 1rem;
		width: 1rem;
	}

	.context-select-popover {
		background: white;
		border: 1px solid var(--color-gray-200);
		border-radius: 8px;
		box-shadow:
			0 4px 6px -1px rgba(0, 0, 0, 0.1),
			0 10px 15px -3px rgba(0, 0, 0, 0.06);
		display: flex;
		flex-direction: column;
		max-height: 14rem;
		overflow: hidden;
		position: fixed;
		z-index: 10;
	}

	.context-select-header {
		align-items: center;
		border-bottom: 1px solid var(--color-gray-100);
		display: flex;
		justify-content: space-between;
		padding: 0.375rem 0.5rem;
	}

	.context-select-title {
		color: var(--color-gray-400);
		font-size: 0.75rem;
		font-weight: 600;
	}

	.context-select-close {
		align-items: center;
		background: none;
		border: none;
		border-radius: 8px;
		color: var(--color-gray-400);
		cursor: pointer;
		display: flex;
		justify-content: center;
		padding: 0.25rem;
	}

	.context-select-close:hover {
		background-color: var(--color-gray-050);
		color: var(--color-gray-600);
	}

	.context-select-close :global(svg) {
		height: 1rem;
		width: 1rem;
	}

	.context-select-list {
		display: flex;
		flex-direction: column;
		list-style: none;
		margin: 0;
		overflow-y: auto;
		padding: 0.25rem;
	}

	.context-select-option {
		align-items: center;
		border-radius: 6px;
		color: var(--color-gray-600);
		display: flex;
		font-size: 0.875rem;
		font-weight: 500;
		line-height: 1.5;
		overflow: hidden;
		padding: 0.375rem 0.5rem;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.context-select-option:hover {
		background-color: var(--color-gray-050);
	}

	.context-select-footer {
		align-items: center;
		background-color: var(--color-gray-050);
		border-top: 1px solid var(--color-gray-200);
		color: var(--color-gray-700);
		display: flex;
		flex-shrink: 0;
		font-size: 0.875rem;
		font-weight: 500;
		gap: 0.5rem;
		line-height: 1.25;
		padding: 0.625rem 0.75rem;
	}

	.context-select-footer:hover {
		background-color: var(--color-gray-100);
	}

	.context-select-footer :global(svg) {
		flex-shrink: 0;
		height: 1rem;
		width: 1rem;
	}

	.context-select-footer :global(svg:last-child) {
		margin-left: auto;
	}

	.context-select-footer-label {
		flex: 1 0 0;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
</style>
