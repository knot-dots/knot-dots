<script lang="ts">
	import { Tabs } from 'melt/builders';
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

	const tabs = new Tabs<'' | 'help' | 'knowledge' | 'rules'>({
		orientation: 'vertical',
		value: ''
	});

	const overlay = getContext('overlay');
</script>

{#if overlay || !$overlayStore}
	<aside class="module-context">
		<div {...tabs.triggerList}>
			<button {@attach tooltip($_('help'))} {...tabs.getTrigger('help')} type="button">
				<QuestionCircle />
				<span class="is-visually-hidden">{$_('help')}</span>
			</button>

			<button {@attach tooltip($_('knowledge'))} {...tabs.getTrigger('knowledge')} type="button">
				<BookOutline />
				<span class="is-visually-hidden">{$_('knowledge')}</span>
			</button>

			<button {@attach tooltip($_('workspace.rules'))} {...tabs.getTrigger('rules')} type="button">
				<Gavel />
				<span class="is-visually-hidden">{$_('rules')}</span>
			</button>
		</div>

		{#if tabs.value}
			<section {...tabs.getContent(tabs.value)}>
				{#if tabs.value == 'help'}
					<ContextHelp {slug}>
						{#snippet children(containers)}
							<ContextTab {containers} empty={$_('help.empty')} {tabs} title={$_('help')} />
						{/snippet}
					</ContextHelp>
				{:else if tabs.value == 'knowledge'}
					<ContextKnowledge>
						{#snippet children(containers)}
							<ContextTab
								{containers}
								empty={$_('knowledge.empty')}
								{tabs}
								title={$_('knowledge')}
							/>
						{/snippet}
					</ContextKnowledge>
				{:else if tabs.value == 'rules'}
					<ContextRules>
						{#snippet children(containers)}
							<ContextTab {containers} empty={$_('rules.empty')} {tabs} title={$_('rules')} />
						{/snippet}
					</ContextRules>
				{/if}
			</section>
		{/if}
	</aside>
{/if}

<style>
	aside {
		--tablist-height: 3rem;
		--tablist-margin: 0.25rem;
		--tablist-padding: 0.25rem;

		display: flex;
	}

	[role='tablist'] {
		border: 1px solid var(--color-border-accent-subtle);
		border-radius: 12px 12px;
		background:
			linear-gradient(205deg, rgba(255, 255, 255, 0.75) 1.32%, rgba(255, 255, 255, 0) 97.79%),
			var(--color-background-accent-muted);
		color: var(--color-text-accent-default);
		display: flex;
		flex: 1;
		flex-direction: row;
		gap: 0.5rem;
		justify-content: center;
		margin: var(--tablist-margin);
		padding: var(--tablist-padding);
		z-index: 1;
	}

	[role='tab'] {
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

	[role='tab']:hover {
		background: var(--color-background-accent-hover);
		color: var(--color-accent-on-default);
	}

	[role='tab'] > :global(svg) {
		color: var(--color-icon-accent-subtle);
		height: 1rem;
		width: 1rem;
	}

	[role='tab'][aria-selected='true'] {
		background: var(--color-background-accent-expanded);
		color: var(--color-text-accent-strong);
	}

	[role='tab'][aria-selected='true'] > :global(svg) {
		color: var(--color-icon-accent-default);
	}

	[role='tabpanel'] {
		background: var(--color-surface-accent-container);
		border-radius: var(--rounded-xl, 12px);
		border: 1px solid var(--color-border-accent-subtle);
		bottom: calc(var(--tablist-height) + var(--tablist-margin) + 2px);
		display: flex;
		flex-direction: column;
		height: calc(100% - var(--tablist-height) - 3 * var(--tablist-margin) - 2px);
		margin: var(--tablist-margin);
		position: absolute;
		width: calc(100% - 2 * var(--tablist-margin));
	}

	@layer visually-hidden {
		@container (max-width: 48rem) {
			.is-visually-hidden {
				all: revert-layer;
			}
		}
	}

	@container (min-width: 48rem) {
		aside {
			margin: var(--tablist-margin);
		}

		[role='tablist'] {
			flex: 0 0 auto;
			flex-direction: column;
			margin: auto 0;
		}

		[role='tablist']:has(+ [role='tabpanel']) {
			border-left: none;
			border-bottom-left-radius: 0;
			border-top-left-radius: 0;
			margin-left: -1px;
			padding-left: 0.25rem;
		}

		[role='tab'] {
			height: 2rem;
		}

		[role='tabpanel'] {
			bottom: 0;
			right: 2.75rem;
			height: calc(100% - 2 * var(--tablist-margin));
			margin: var(--tablist-margin) 0;
			width: 23.75rem;
		}
	}
</style>
