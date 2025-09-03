<script lang="ts">
	import type { Snippet } from 'svelte';
	import { dndzone, SHADOW_ITEM_MARKER_PROPERTY_NAME, TRIGGERS } from 'svelte-dnd-action';
	import type { DndEvent, Item } from 'svelte-dnd-action';
	import { browser } from '$app/environment';
	import { page } from '$app/state';
	import { isPartOf, overlayKey } from '$lib/models';
	import type { Container } from '$lib/models';
	import Card from '$lib/components/Card.svelte';
	import { ability, dragged, overlay } from '$lib/stores';

	interface Props {
		containers: Container[];
		itemSnippet?: Snippet<[Container]>;
	}

	let { containers, itemSnippet }: Props = $props();

	let items = $derived(containers.map((container) => ({ guid: container.guid, container })));

	let shouldIgnoreDndEvents = false;

	function handleDndConsider(event: CustomEvent<DndEvent<{ guid: string; container: Container }>>) {
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

	function handleDndFinalize(event: CustomEvent<DndEvent<{ guid: string; container: Container }>>) {
		if (!shouldIgnoreDndEvents) {
			items = event.detail.items;
		} else {
			items = [...items];
			shouldIgnoreDndEvents = false;
		}
	}
</script>

{#if browser && !matchMedia('(pointer: coarse)').matches && $overlay?.key === overlayKey.enum.relations && $ability.can('relate', $overlay.container)}
	<div
		class="vertical-scroll-wrapper masked-overflow"
		use:dndzone={{ items, dropFromOthersDisabled: true, centreDraggedOnCursor: true }}
		onconsider={handleDndConsider}
		onfinalize={handleDndFinalize}
	>
		{#each items as { guid, container } (guid)}
			<div>
				{#if itemSnippet}
					{@render itemSnippet(container)}
				{:else}
					<Card
						{container}
						relatedContainers={page.data.containersWithIndicatorContributions?.filter(
							isPartOf(container)
						) ?? []}
						showRelationFilter
					/>
				{/if}
			</div>
		{/each}
	</div>
{:else}
	<div class="vertical-scroll-wrapper masked-overflow">
		{#each items as { container }}
			{#if itemSnippet}
				{@render itemSnippet(container)}
			{:else}
				<Card
					{container}
					relatedContainers={page.data.containersWithIndicatorContributions?.filter(
						isPartOf(container)
					) ?? []}
					showRelationFilter
				/>
			{/if}
		{/each}
	</div>
{/if}
