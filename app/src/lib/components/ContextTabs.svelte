<script lang="ts" module>
	let width = $state();
</script>

<script lang="ts">
	import { Accordion } from 'melt/builders';
	import { getContext } from 'svelte';
	import { _ } from 'svelte-i18n';
	import BookOutline from '~icons/flowbite/book-outline';
	import QuestionCircle from '~icons/flowbite/question-circle-outline';
	import Gavel from '~icons/knotdots/gavel';
	import tooltip from '$lib/attachments/tooltip';
	import ContextHelp from '$lib/components/ContextHelp.svelte';
	import ContextKnowledge from '$lib/components/ContextKnowledge.svelte';
	import ContextRules from '$lib/components/ContextRules.svelte';
	import ContextTab from '$lib/components/ContextTab.svelte';
	import { type HelpSlug } from '$lib/models';
	import { overlay as overlayStore } from '$lib/stores';

	interface Props {
		slug: HelpSlug;
	}

	let { slug }: Props = $props();

	const tabs = new Accordion();

	const tabItems = [
		{ id: 'help', icon: QuestionCircle, title: $_('help') },
		{ id: 'knowledge', icon: BookOutline, title: $_('knowledge') },
		{ id: 'rules', icon: Gavel, title: $_('rules') }
	];

	const overlay = getContext('overlay');

	let initialWidth = $state(0);

	let offset = $state(0);

	function startResize(event: MouseEvent & { currentTarget: HTMLElement }) {
		event.preventDefault();
		offset = event.pageX;
		initialWidth = event.currentTarget.parentElement?.offsetWidth ?? 0;
		window.addEventListener('mousemove', resize);
	}

	function stopResize() {
		window.removeEventListener('mousemove', resize);
	}

	function resize(event: MouseEvent) {
		width = offset - event.pageX + initialWidth;
	}
</script>

<svelte:window onmouseup={stopResize} />

{#if overlay || !$overlayStore}
	<aside class="module-context">
		<div {...tabs.root} class="tablist">
			{#each tabItems as item (item.id)}
				{const tabItem = tabs.getItem(item)}
				<button
					{@attach tooltip(tabItem.item.title)}
					{...tabItem.trigger}
					class="tab"
					type="button"
				>
					<tabItem.item.icon />
					<span class="is-visually-hidden">{tabItem.item.title}</span>
				</button>
			{/each}
		</div>

		{#each tabItems as item (item.id)}
			{const tabItem = tabs.getItem(item)}
			{#if tabItem.isExpanded}
				<section bind:offsetWidth={width} style:width="{width}px" class="tabpanel">
					<div class="resize-handle" onmousedown={startResize} role="separator"></div>
					{#if item.id == 'help'}
						<ContextHelp {slug}>
							{#snippet children(containers)}
								<ContextTab {containers} empty={$_('help.empty')} {tabItem} />
							{/snippet}
						</ContextHelp>
					{:else if item.id == 'knowledge'}
						<ContextKnowledge>
							{#snippet children(containers)}
								<ContextTab {containers} empty={$_('knowledge.empty')} {tabItem} />
							{/snippet}
						</ContextKnowledge>
					{:else if item.id == 'rules'}
						<ContextRules>
							{#snippet children(containers)}
								<ContextTab {containers} empty={$_('rules.empty')} {tabItem} />
							{/snippet}
						</ContextRules>
					{/if}
				</section>
			{/if}
		{/each}
	</aside>
{/if}

<style>
	aside {
		--margin: 0.25rem;

		bottom: 0;
		display: flex;
		flex-direction: column-reverse;
		gap: var(--margin);
		margin: var(--margin);
		position: absolute;
		right: 0;
		z-index: 1;
	}

	aside:has(.tabpanel) {
		height: calc(100% - 2 * var(--margin));
		width: calc(100% - 2 * var(--margin));
	}

	.tablist {
		--tablist-height: 3rem;
		--tablist-padding: 0.25rem;

		color: var(--color-text-accent-default);
		display: flex;
		flex: 0;
		flex-direction: row;
		gap: 0.5rem;
		justify-content: center;
		padding: var(--tablist-padding);
		z-index: 1;
	}

	.tablist:has(+ .tabpanel) {
		border: 1px solid var(--color-border-accent-subtle);
		border-radius: 12px;
		background:
			linear-gradient(205deg, rgba(255, 255, 255, 0.75) 1.32%, rgba(255, 255, 255, 0) 97.79%),
			var(--color-background-accent-muted);
	}

	.tab {
		--button-active-background: transparent;
		--button-background: transparent;
		--button-hover-background: transparent;
		--padding-x: 0.5rem;
		--padding-y: 0;

		align-items: center;
		border: none;
		color: var(--color-text-accent-default);
		cursor: pointer;
		display: flex;
		font-size: 0.875rem;
		height: calc(var(--tablist-height) - 2 * var(--tablist-padding));
		white-space: nowrap;
	}

	.tab:hover {
		background: var(--color-background-accent-hover);
		color: var(--color-accent-on-default);
	}

	.tab > :global(svg) {
		color: var(--color-icon-accent-subtle);
		height: 1rem;
		width: 1rem;
	}

	.tab[aria-expanded='true'] {
		background: var(--color-background-accent-expanded);
		color: var(--color-text-accent-strong);
	}

	.tab[aria-expanded='true'] > :global(svg) {
		color: var(--color-icon-accent-default);
	}

	.tabpanel {
		background: var(--color-surface-accent-container);
		border-radius: var(--rounded-xl, 12px);
		border: 1px solid var(--color-border-accent-subtle);
		display: flex;
		flex: 1;
		flex-direction: column;
		max-width: 100%;
		min-height: 0;
		min-width: 100%;
	}

	@container (max-width: 48rem) {
		@layer visually-hidden {
			.tablist:has(+ .tabpanel) .tab .is-visually-hidden {
				all: revert-layer;
			}
		}

		.tablist:not(:has(+ .tabpanel)) .tab {
			display: none;
		}

		.tablist:not(:has(+ .tabpanel)) .tab:first-child {
			aspect-ratio: 1;
			background-color: var(--color-white);
			border: solid 1px var(--color-border-subtle);
			border-radius: calc(infinity * 1px);
			box-shadow: var(--shadow-xl);
			color: var(--color-icon-accent-subtle);
			display: flex;
			margin-left: auto;
			place-content: center;
		}

		.tablist:not(:has(+ .tabpanel)) .tab:first-child > :global(svg) {
			height: 1.25rem;
			width: 1.25rem;
		}
	}

	@container (min-width: 48rem) {
		aside {
			flex: 0 1;
			flex-direction: row-reverse;
			gap: 0;
			position: relative;
			width: auto;
		}

		.tablist {
			background:
				linear-gradient(205deg, rgba(255, 255, 255, 0.75) 1.32%, rgba(255, 255, 255, 0) 97.79%),
				var(--color-background-accent-muted);
			border: 1px solid var(--color-border-accent-subtle);
			border-radius: 12px;
			flex-direction: column;
			margin: auto 0;
		}

		.tablist:has(+ .tabpanel) {
			border-left: none;
			border-bottom-left-radius: 0;
			border-top-left-radius: 0;
			margin-left: -1px;
			padding-left: 0.25rem;
		}

		.tab {
			height: 2rem;
		}

		.tabpanel {
			bottom: 0;
			max-width: 80cqw;
			min-width: 23.75rem;
			position: absolute;
			right: 2.5rem;
			top: 0;
			width: 23.75rem;
		}
	}

	@container details (min-width: 48rem) {
		.tabpanel {
			flex-direction: column;
			height: 100%;
			margin: 0;
			position: static;
		}
	}

	.resize-handle {
		background-image: url(/src/lib/assets/resize-handle.svg);
		background-position: 2px center;
		background-repeat: no-repeat;
		background-clip: border-box;
		border-right: solid 2px transparent;
		cursor: ew-resize;
		display: none;
		height: 100%;
		left: -0.75rem;
		min-width: 0;
		position: absolute;
		width: 0.75rem;
		z-index: 1;
	}

	@container (min-width: 48rem) {
		.resize-handle {
			display: block;
		}
	}
</style>
