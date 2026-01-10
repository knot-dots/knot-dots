<script lang="ts" module>
	import { type AnyContainer } from '$lib/models';
</script>

<script lang="ts" generics="Item extends AnyContainer">
	import type { Snippet } from 'svelte';
	import { _ } from 'svelte-i18n';
	import CirclePlus from '~icons/flowbite/circle-plus-solid';

	interface Props {
		addItem: (event: Event) => void;
		items: Item[];
		itemSnippet: Snippet<[Item]>;
		mayAddItem?: boolean;
	}

	let { addItem, items, itemSnippet, mayAddItem = false }: Props = $props();
</script>

{#if items.length > 0 || mayAddItem}
	<ul class="card-list">
		{#each items as item (item.guid)}
			<li>
				{@render itemSnippet(item)}
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
	.card-list {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}
</style>
