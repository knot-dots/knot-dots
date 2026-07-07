<script lang="ts" module>
	import { type AnyContainer } from '$lib/models';
</script>

<script lang="ts" generics="Item extends AnyContainer">
	import type { Snippet } from 'svelte';
	import { flip } from 'svelte/animate';
	import { dndzone } from 'svelte-dnd-action';
	import { _ } from 'svelte-i18n';
	import CirclePlus from '~icons/flowbite/circle-plus-solid';

	interface Props {
		addItem: (event: Event) => void;
		handleSort?: (items: Item[]) => void;
		items: Item[];
		itemSnippet: Snippet<[Item]>;
		mayAddItem?: boolean;
	}

	let { addItem, handleSort, items, itemSnippet, mayAddItem = false }: Props = $props();

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
		class="wall"
		{onconsider}
		{onfinalize}
		use:dndzone={{ dropTargetStyle: {}, flipDurationMs: 100, items, type }}
	>
		{#each items as item (item.guid)}
			<li animate:flip={{ duration: 100 }}>
				{@render itemSnippet(item)}
			</li>
		{/each}

		<li>
			<button aria-label={$_('add_item')} class="card" onclick={addItem} type="button">
				<CirclePlus />
			</button>
		</li>
	</ul>
{:else if items.length > 0}
	<ul class="wall">
		{#each items as item (item.guid)}
			<li>
				{@render itemSnippet(item)}
			</li>
		{/each}

		<li>
			<button aria-label={$_('add_item')} class="card" onclick={addItem} type="button">
				<CirclePlus />
			</button>
		</li>
	</ul>
{/if}

<style>
	.card :global(svg) {
		height: 2.25rem;
		width: 2.25rem;
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
		min-height: 6rem;
		justify-content: center;
	}
</style>
