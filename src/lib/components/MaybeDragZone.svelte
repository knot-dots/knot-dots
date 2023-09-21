<script lang="ts">
	import { dndzone, SHADOW_ITEM_MARKER_PROPERTY_NAME, TRIGGERS } from 'svelte-dnd-action';
	import type { DndEvent, Item } from 'svelte-dnd-action';
	import { page } from '$app/stores';
	import { isPartOf } from '$lib/models';
	import type { Container } from '$lib/models';
	import Card from '$lib/components/Card.svelte';
	import { dragged, user } from '$lib/stores';

	export let containers: Container[];

	$: items = containers.map((container) => ({ guid: container.guid, container }));

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

{#if $page.data.relationOverlayData && $user.isAuthenticated}
	<div
		class="vertical-scroll-wrapper masked-overflow"
		use:dndzone={{ items, dropFromOthersDisabled: true }}
		on:consider={handleDndConsider}
		on:finalize={handleDndFinalize}
	>
		{#each items as { guid, container } (guid)}
			<div>
				<Card
					{container}
					relatedContainers={$page.data.containersWithIndicatorContributions?.filter(
						isPartOf(container)
					)}
					showRelationFilter
				/>
			</div>
		{/each}
	</div>
{:else}
	<div class="vertical-scroll-wrapper masked-overflow">
		{#each items as { container }}
			<Card
				{container}
				relatedContainers={$page.data.containersWithIndicatorContributions?.filter(
					isPartOf(container)
				)}
				showRelationFilter
			/>
		{/each}
	</div>
{/if}
