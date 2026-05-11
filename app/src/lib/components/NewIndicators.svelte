<script lang="ts">
	import { getContext } from 'svelte';
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
	import { env } from '$env/dynamic/public';
	import IndicatorPicker from '$lib/components/IndicatorPicker.svelte';
	import NewIndicatorCard from '$lib/components/NewIndicatorCard.svelte';
	import { createFeatureDecisions } from '$lib/features';
	import {
		type BinaryIndicatorContainer,
		type Container,
		containerOfType,
		findConnected,
		indicatorCategories,
		type IndicatorTemplateContainer,
		isActualDataContainer,
		isBinaryIndicatorContainer,
		isContainerWithEffect,
		isContainerWithObjective,
		isIndicatorTemplateContainer,
		type NewContainer,
		overlayKey,
		payloadTypes,
		predicates,
		units
	} from '$lib/models';
	import {
		ability,
		applicationState,
		dragged,
		mayCreateContainer,
		newContainer,
		overlay
	} from '$lib/stores';

	interface Props {
		containers: Container[];
	}

	let { containers }: Props = $props();

	let selectedContainer = $derived.by(() => {
		if (page.url.searchParams.has('related-to')) {
			return containers
				.filter(isIndicatorTemplateContainer)
				.find(({ guid }) => guid === page.url.searchParams.get('related-to'));
		} else {
			return undefined;
		}
	});

	let items = $derived.by(() => {
		if (selectedContainer) {
			const connectedContainers = findConnected(
				selectedContainer,
				containers.filter((c) => isIndicatorTemplateContainer(c) || isBinaryIndicatorContainer(c)),
				[predicates.enum['is-affected-by']]
			);
			return containers
				.filter((c) => isIndicatorTemplateContainer(c) || isBinaryIndicatorContainer(c))
				.filter((c) => connectedContainers.has(c))
				.map((container) => ({ guid: container.guid, container }));
		} else {
			return containers
				.filter((c) => isIndicatorTemplateContainer(c) || isBinaryIndicatorContainer(c))
				.map((container) => ({ guid: container.guid, container }));
		}
	});

	let managedBy = $derived(
		(page.data.currentOrganizationalUnit ?? page.data.currentOrganization).guid
	);

	let mayCreateBinaryIndicator = $derived(
		createFeatureDecisions(page.data.features).useBinaryIndicators() &&
			$mayCreateContainer(payloadTypes.enum.binary_indicator, managedBy)
	);

	// svelte-ignore non_reactive_update
	let dialog: HTMLDialogElement;

	const createContainerDialog = getContext<{ getElement: () => HTMLDialogElement }>(
		'createContainerDialog'
	);

	function createCustomIndicatorTemplate() {
		const container = containerOfType(
			payloadTypes.enum.indicator_template,
			page.data.currentOrganization.guid,
			page.data.currentOrganizationalUnit?.guid ?? null,
			page.data.currentOrganizationalUnit?.guid ?? page.data.currentOrganization.guid,
			env.PUBLIC_KC_REALM as string
		) as Omit<NewContainer, 'payload'> & Pick<IndicatorTemplateContainer, 'payload'>;

		container.payload.title = '';
		container.payload.unit = units.enum['unit.cubic_meter'];
		container.payload.indicatorCategory = [indicatorCategories.enum['indicator_category.custom']];

		$newContainer = container;

		createContainerDialog.getElement().showModal();
	}

	function createBinaryIndicator() {
		const container = containerOfType(
			payloadTypes.enum.binary_indicator,
			page.data.currentOrganization.guid,
			page.data.currentOrganizationalUnit?.guid ?? null,
			page.data.currentOrganizationalUnit?.guid ?? page.data.currentOrganization.guid,
			env.PUBLIC_KC_REALM as string
		) as Omit<NewContainer, 'payload'> & Pick<BinaryIndicatorContainer, 'payload'>;

		container.payload.title = '';
		container.payload.indicatorCategory = [indicatorCategories.enum['indicator_category.custom']];

		$newContainer = container;

		createContainerDialog.getElement().showModal();
	}

	let shouldIgnoreDndEvents = $state(false);

	function handleDndConsider(
		event: CustomEvent<
			DndEvent<{ guid: string; container: IndicatorTemplateContainer | BinaryIndicatorContainer }>
		>
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
		event: CustomEvent<
			DndEvent<{ guid: string; container: IndicatorTemplateContainer | BinaryIndicatorContainer }>
		>
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
	{#if ($mayCreateContainer(payloadTypes.enum.indicator_template, managedBy) || mayCreateBinaryIndicator) && $applicationState.containerDetailView.editable}
		<p>
			{#if $mayCreateContainer(payloadTypes.enum.actual_data, managedBy)}
				<button
					class="button button-xs button-primary"
					onclick={() => dialog.showModal()}
					type="button"
				>
					{$_('indicators.activate_selected')}
				</button>
			{/if}

			{#if $mayCreateContainer(payloadTypes.enum.indicator_template, managedBy)}
				<button class="button button-xs" type="button" onclick={createCustomIndicatorTemplate}>
					<Plus />
					{$_('indicators.create_custom')}
				</button>
			{/if}

			{#if mayCreateBinaryIndicator}
				<button class="button button-xs" type="button" onclick={createBinaryIndicator}>
					<Plus />
					{$_('indicators.create_binary')}
				</button>
			{/if}
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
					...containers
						.filter(isActualDataContainer)
						.filter(({ payload }) => payload.indicator === guid),
					...containers
						.filter(({ relation }) =>
							relation.some(
								({ object, predicate }) =>
									object === guid &&
									(predicate === predicates.enum['is-measured-by'] ||
										predicate === predicates.enum['is-objective-for'])
							)
						)
						.filter((c) => c.guid !== guid),
					...containers.filter(isContainerWithEffect),
					...containers.filter(isContainerWithObjective)
				]}
				<li>
					<NewIndicatorCard --height="100%" {container} {relatedContainers} showRelationFilter />
				</li>
			{/each}
		</ul>
	{:else}
		<ul>
			{#each items as { guid, container } (guid)}
				{@const relatedContainers = [
					...containers
						.filter(isActualDataContainer)
						.filter(({ payload }) => payload.indicator === guid),
					...containers
						.filter(({ relation }) =>
							relation.some(
								({ object, predicate }) =>
									object === guid &&
									(predicate === predicates.enum['is-measured-by'] ||
										predicate === predicates.enum['is-objective-for'])
							)
						)
						.filter((c) => c.guid !== guid),
					...containers.filter(isContainerWithEffect),
					...containers.filter(isContainerWithObjective)
				]}
				<li>
					<NewIndicatorCard --height="100%" {container} {relatedContainers} showRelationFilter />
				</li>
			{/each}
		</ul>
	{/if}
</div>

{#if $mayCreateContainer(payloadTypes.enum.actual_data, managedBy)}
	<IndicatorPicker bind:dialog />
{/if}

<style>
	div {
		height: 100%;
		min-width: calc(100vw - var(--sidebar-max-width) - 1px);
		overflow-y: auto;
		padding: 1.5rem;
	}

	p {
		display: flex;
		gap: 0.5rem;
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
