<script lang="ts" module>
	import { type AnyContainer } from '$lib/models';
</script>

<script lang="ts" generics="Item extends AnyContainer">
	import type { Snippet } from 'svelte';
	import { _ } from 'svelte-i18n';
	import CirclePlus from '~icons/flowbite/circle-plus-solid';
	import ChevronDown from '~icons/flowbite/chevron-down-outline';
	import ChevronUp from '~icons/flowbite/chevron-up-outline';
	import { SvelteSet } from 'svelte/reactivity';

	interface Props {
		addItem: (event: Event) => void;
		items: Item[];
		itemSnippet: Snippet<[Item]>;
		mayAddItem?: boolean;
		titles?: string[];
	}

	let { addItem, items, itemSnippet, mayAddItem = false, titles }: Props = $props();

	let openItems = new SvelteSet<string>();

	function toggle(guid: string) {
		if (openItems.has(guid)) {
			openItems.delete(guid);
		} else {
			openItems.add(guid);
		}
	}
</script>

{#if items.length > 0 || mayAddItem}
	<ul class="accordion-list">
		{#each items as item, idx (item.guid)}
			<li class="accordion-item">
				<button
					class="accordion-header"
					onclick={() => toggle(item.guid)}
					type="button"
					aria-expanded={openItems.has(item.guid)}
				>
					<span class="accordion-title">{titles?.[idx] || (item.payload as any).title}</span>
					{#if openItems.has(item.guid)}
						<ChevronUp />
					{:else}
						<ChevronDown />
					{/if}
				</button>

				{#if openItems.has(item.guid)}
					<div class="accordion-content">
						{@render itemSnippet(item)}
					</div>
				{/if}
			</li>
		{/each}

		{#if mayAddItem}
			<li>
				<button aria-label={$_('add_item')} class="card" onclick={addItem} type="button">
					<CirclePlus />
				</button>
			</li>
		{/if}
	</ul>
{/if}

<style>
	.accordion-list {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.accordion-item {
		display: flex;
		flex-direction: column;
		background: #ffffff;
		border-bottom: 1px solid var(--color-gray-200);
	}

	.accordion-header {
		align-items: center;
		background: none;
		border: none;
		cursor: pointer;
		display: flex;
		justify-content: space-between;
		padding: 1rem 0;
		width: 100%;
		text-align: left;
	}

	.accordion-header:hover {
		background-color: var(--color-gray-50);
	}

	.accordion-title {
		font-weight: 600;
	}

	.accordion-header :global(svg) {
		height: 1.5rem;
		width: 1.5rem;
		color: var(--color-gray-500);
	}

	.card {
		align-items: center;
		background: #ffffff;
		border: 1px solid var(--color-gray-200);
		border-radius: 8px;
		box-shadow: var(--shadow-sm);
		cursor: pointer;
		display: grid;
		grid-row: 1 / 4;
		min-height: 4rem;
		justify-content: center;
		width: 100%;
	}

	.card :global(svg) {
		height: 2.25rem;
		width: 2.25rem;
	}
</style>
