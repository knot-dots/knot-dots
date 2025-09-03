<script lang="ts">
	import { _ } from 'svelte-i18n';
	import {
		type DndEvent,
		dndzone,
		type Item,
		SHADOW_ITEM_MARKER_PROPERTY_NAME,
		TRIGGERS
	} from 'svelte-dnd-action';
	import Plus from '~icons/knotdots/plus';
	import { browser } from '$app/environment';
	import { page } from '$app/state';
	import Card from '$lib/components/Card.svelte';
	import {
		type Container,
		findConnected,
		type IndicatorContainer,
		isContainerWithEffect,
		isContainerWithObjective,
		isIndicatorContainer,
		overlayKey,
		payloadTypes,
		predicates
	} from '$lib/models';
	import { ability, dragged, overlay } from '$lib/stores';

	interface Props {
		containers: Container[];
	}

	let { containers }: Props = $props();

	let selectedContainer = $derived.by(() => {
		if (page.url.searchParams.has('related-to')) {
			return containers
				.filter(isIndicatorContainer)
				.find(({ guid }) => guid === page.url.searchParams.get('related-to'));
		} else {
			return undefined;
		}
	});

	let items = $derived.by(() => {
		if (selectedContainer) {
			const connectedContainers = findConnected(
				selectedContainer,
				containers.filter(isIndicatorContainer),
				[predicates.enum['is-affected-by']]
			);
			return containers
				.filter(isIndicatorContainer)
				.filter((c) => connectedContainers.has(c))
				.map((container) => ({ guid: container.guid, container }));
		} else {
			return containers
				.filter(isIndicatorContainer)
				.map((container) => ({ guid: container.guid, container }));
		}
	});

	let shouldIgnoreDndEvents = $state(false);

	function handleDndConsider(
		event: CustomEvent<DndEvent<{ guid: string; container: IndicatorContainer }>>
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
		event: CustomEvent<DndEvent<{ guid: string; container: IndicatorContainer }>>
	) {
		if (!shouldIgnoreDndEvents) {
			items = event.detail.items;
		} else {
			items = [...items];
			shouldIgnoreDndEvents = false;
		}
	}
</script>

<div class="indicators">
	{#if $ability.can('create', payloadTypes.enum.indicator)}
		<p>
			<a class="button button-xs button-primary" href="#indicator-catalog">
				<Plus />
				{$_('indicator')}
			</a>
		</p>
	{/if}

	{#if browser && !matchMedia('(pointer: coarse)').matches && $overlay?.key === overlayKey.enum.relations && $ability.can('relate', $overlay.container)}
		<ul
			use:dndzone={{ items, dropFromOthersDisabled: true, centreDraggedOnCursor: true }}
			onconsider={handleDndConsider}
			onfinalize={handleDndFinalize}
		>
			{#each items as { guid, container } (guid)}
				{@const relatedContainers = [
					...containers.filter(({ relation }) =>
						relation.some(({ object }) => object === container.guid)
					),
					...containers.filter(isContainerWithEffect),
					...containers.filter(isContainerWithObjective)
				]}
				<li>
					<Card --height="100%" {container} {relatedContainers} showRelationFilter />
				</li>
			{/each}
		</ul>
	{:else}
		<ul>
			{#each items as { guid, container } (guid)}
				{@const relatedContainers = [
					...containers.filter(({ relation }) =>
						relation.some(({ object }) => object === container.guid)
					),
					...containers.filter(isContainerWithEffect),
					...containers.filter(isContainerWithObjective)
				]}
				<li>
					<Card --height="100%" {container} {relatedContainers} showRelationFilter />
				</li>
			{/each}
		</ul>
	{/if}
</div>

<style>
	div {
		height: 100%;
		min-width: calc(100vw - var(--sidebar-max-width) - 1px);
		overflow-y: auto;
		padding: 1.5rem;
	}

	p {
		margin-bottom: 1.5rem;
	}

	ul {
		display: flex;
		flex-direction: row;
		flex-wrap: wrap;
		gap: 1.5rem;
	}

	li {
		width: 19.5rem;
	}

	.button {
		align-items: center;
		display: inline-flex;
		gap: 0.5rem;
	}
</style>
