<script lang="ts">
	import type { Snippet } from 'svelte';
	import {
		type DndEvent,
		dndzone,
		type Item,
		SHADOW_ITEM_MARKER_PROPERTY_NAME,
		TRIGGERS
	} from 'svelte-dnd-action';
	import { browser } from '$app/environment';
	import Card from '$lib/components/Card.svelte';
	import { type AnyPayload, type Container, overlayKey } from '$lib/models';
	import { ability, dragged, overlay } from '$lib/stores';

	interface Props {
		containers: Container<AnyPayload>[];
		footer?: Snippet;
		itemSnippet?: Snippet<[Container<AnyPayload>]>;
	}

	let { containers, footer, itemSnippet }: Props = $props();

	let items = $derived(containers.map((container) => ({ guid: container.guid, container })));

	let shouldIgnoreDndEvents = false;

	function handleDndConsider(
		event: CustomEvent<DndEvent<{ guid: string; container: Container<AnyPayload> }>>
	) {
		const { trigger, id } = event.detail.info;
		if (trigger === TRIGGERS.DRAG_STARTED) {
			const idx = items.findIndex((item) => item.guid === id);
			const newId = `${id}_copy_${Math.round(Math.random() * 100000)}`;
			dragged.set(items[idx].container);
			// the line below was added in order to be compatible with version svelte-dnd-action 0.7.4 and above
			event.detail.items = event.detail.items.filter(
				(item: Item) => !item[SHADOW_ITEM_MARKER_PROPERTY_NAME]
			);
			event.detail.items.splice(idx, 0, { ...items[idx], guid: newId });
			items = event.detail.items;
			shouldIgnoreDndEvents = true;
		} else if (!shouldIgnoreDndEvents) {
			items = event.detail.items;
		} else {
			items = [...items];
		}
	}

	function handleDndFinalize(
		event: CustomEvent<DndEvent<{ guid: string; container: Container<AnyPayload> }>>
	) {
		if (!shouldIgnoreDndEvents) {
			items = event.detail.items;
		} else {
			items = [...items];
			shouldIgnoreDndEvents = false;
		}
	}
</script>

{#if browser && !matchMedia('(pointer: coarse)').matches && $overlay?.key === overlayKey.enum.relations && $ability.can('relate', $overlay.container)}
	<div class="vertical-scroll-wrapper">
		<ul
			use:dndzone={{ items, dropFromOthersDisabled: true, centreDraggedOnCursor: true }}
			onconsider={handleDndConsider}
			onfinalize={handleDndFinalize}
		>
			{#each items as { guid, container } (guid)}
				<li>
					{#if itemSnippet}
						{@render itemSnippet(container)}
					{:else}
						<Card {container} showRelationFilter />
					{/if}
				</li>
			{/each}
		</ul>
		{#if footer}
			{@render footer()}
		{/if}
	</div>
{:else}
	<div class="vertical-scroll-wrapper">
		<ul>
			{#each items as { container, guid } (guid)}
				<li>
					{#if itemSnippet}
						{@render itemSnippet(container)}
					{:else}
						<Card {container} showRelationFilter />
					{/if}
				</li>
			{/each}
		</ul>
		{#if footer}
			{@render footer()}
		{/if}
	</div>
{/if}

<style>
	li:not(:last-child) {
		margin-bottom: 0.75rem;
	}
</style>
