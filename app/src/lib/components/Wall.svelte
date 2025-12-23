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
	<ul class="wall">
		{#each items as item}
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
