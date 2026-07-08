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
		class="card-list"
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
	<ul class="card-list">
		{#each items as item (item.guid)}
			<li>
				{@render itemSnippet(item)}
			</li>
		{/each}
	</ul>
{/if}

<style>
	.card-list {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}
</style>
