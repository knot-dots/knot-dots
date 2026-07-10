<script lang="ts" module>
	import type { AnyPayload, Container } from '$lib/models';
</script>

<script lang="ts" generics="Item extends Container<AnyPayload>">
	import type { Snippet } from 'svelte';
	import { flip } from 'svelte/animate';
	import { dndzone } from 'svelte-dnd-action';
	import { _ } from 'svelte-i18n';
	import CirclePlus from '~icons/flowbite/circle-plus-solid';
	import tooltip from '$lib/attachments/tooltip';

	interface Props {
		addItem: (event: Event) => void;
		addItemSnippet?: Snippet;
		handleSort?: (items: Item[]) => void;
		items: Item[];
		itemSnippet: Snippet<[Item]>;
		mayAddItem?: boolean;
		onLoadMore?: () => void;
	}

	let {
		addItem,
		addItemSnippet,
		handleSort,
		items,
		itemSnippet,
		mayAddItem = false,
		onLoadMore
	}: Props = $props();

	function onconsider(event: CustomEvent) {
		items = event.detail.items;
	}

	function onfinalize(event: CustomEvent) {
		items = event.detail.items;
		handleSort?.(items);
	}
</script>

{#if mayAddItem}
	{@const type = crypto.randomUUID()}
	<ul
		class="carousel"
		{onconsider}
		{onfinalize}
		use:dndzone={{ dropTargetStyle: {}, flipDurationMs: 100, items, type }}
	>
		{#each items as item (item.guid)}
			<li animate:flip={{ duration: 100 }}>
				{@render itemSnippet(item)}
			</li>
		{/each}

		{#if onLoadMore}
			<li>
				<button class="card" onclick={onLoadMore} type="button">
					{$_('load_more')}
				</button>
			</li>
		{/if}

		{#if addItemSnippet}
			{@render addItemSnippet()}
		{:else}
			<li>
				<button class="card" onclick={addItem} type="button" {@attach tooltip($_('add_item'))}>
					<CirclePlus />
				</button>
			</li>
		{/if}
	</ul>
{:else if items.length > 0}
	<ul class="carousel">
		{#each items as item (item.guid)}
			<li>
				{@render itemSnippet(item)}
			</li>
		{/each}

		{#if onLoadMore}
			<li>
				<button class="card" onclick={onLoadMore} type="button">
					{$_('load_more')}
				</button>
			</li>
		{/if}
	</ul>
{/if}

<style>
	.card {
		align-items: center;
		background: #ffffff;
		border: 1px solid var(--color-gray-200);
		border-radius: 8px;
		box-shadow: var(--shadow-sm);
		cursor: pointer;
		display: grid;
		grid-row: 1 / 4;
		min-height: 6rem;
		justify-content: center;
	}

	.card :global(svg) {
		height: 2.25rem;
		width: 2.25rem;
	}
</style>
