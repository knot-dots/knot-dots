<script lang="ts">
	import { getContext } from 'svelte';
	import type { Writable } from 'svelte/store';
	import { type DndEvent, dndzone } from 'svelte-dnd-action';
	import { _ } from 'svelte-i18n';
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import saveContainer from '$lib/client/saveContainer';
	import Board from '$lib/components/Board.svelte';
	import BoardColumn from '$lib/components/BoardColumn.svelte';
	import Card from '$lib/components/Card.svelte';
	import MaybeDragZone from '$lib/components/MaybeDragZone.svelte';
	import ResourceDataCard from '$lib/components/ResourceDataCard.svelte';
	import {
		type Container,
		containerOfType,
		type EffectPayload,
		type GoalPayload,
		type IooiType,
		iooiTypes,
		isContainerWithPayloadType,
		type MeasurePayload,
		type NewContainer,
		type ObjectivePayload,
		overlayKey,
		paramsFromFragment,
		payloadTypes,
		predicates,
		resourceDataTypes
	} from '$lib/models';
	import {
		ability,
		addEffectState,
		addObjectiveState,
		lastCreatedContainer,
		newContainer
	} from '$lib/stores';

	interface Props {
		container: Container<GoalPayload> | Container<MeasurePayload>;
		containers: Container[];
	}

	let { container, containers }: Props = $props();

	const createContainerDialog = getContext<{ getElement: () => HTMLDialogElement }>(
		'createContainerDialog'
	);

	// Watch for successfully created resourceData containers and create collection if needed
	$effect(() => {
		const created = $lastCreatedContainer;

		if (
			created &&
			isContainerWithPayloadType(payloadTypes.enum.resource_data, created) &&
			container
		) {
			// Check if this resourceData belongs to our container
			const belongsToThisContainer = created.relation.some(
				(r) => r.object === container.guid && r.predicate === predicates.enum['is-part-of']
			);

			if (belongsToThisContainer) {
				createResourceDataCollectionIfNeeded(created.payload.resourceDataType);
			}
		}
	});

	// Function to check if collection exists and create it if not
	async function createResourceDataCollectionIfNeeded(resourceDataType: string) {
		if (!container) return;

		// Check if a collection with this resourceDataType already exists
		const collectionExists = containers.some(
			(c) =>
				isContainerWithPayloadType(payloadTypes.enum.resource_data_collection, c) &&
				c.payload.resourceDataType === resourceDataType &&
				c.relation.some(
					(r) => r.object === container.guid && r.predicate === predicates.enum['is-section-of']
				)
		);

		if (!collectionExists) {
			// Create the collection
			const collection = containerOfType(
				payloadTypes.enum.resource_data_collection,
				container.organization,
				container.organizational_unit,
				container.managed_by,
				container.realm
			) as NewContainer;

			// Set the resourceDataType
			(collection.payload as { resourceDataType?: string }).resourceDataType = resourceDataType;

			// Set relation as a section of the container
			collection.relation = [
				{
					object: container.guid,
					position: containers.filter((c) =>
						c.relation.some(
							(r) => r.object === container.guid && r.predicate === predicates.enum['is-section-of']
						)
					).length,
					predicate: predicates.enum['is-section-of']
				}
			];

			// Save the collection
			const response = await saveContainer(collection);
			if (!response.ok) {
				const error = await response.json();
				console.error('Failed to create resource data collection:', error.message);
			}
		}
	}

	const { itemType, itemFilterFn, addItemState } = $derived.by(() => {
		if (isContainerWithPayloadType(payloadTypes.enum.goal, container)) {
			return {
				itemType: 'objective' as const,
				itemFilterFn: (c: Container) => isContainerWithPayloadType(payloadTypes.enum.objective, c),
				addItemState: addObjectiveState
			};
		} else if (isContainerWithPayloadType(payloadTypes.enum.measure, container)) {
			return {
				itemType: 'effect' as const,
				itemFilterFn: (c: Container) => isContainerWithPayloadType(payloadTypes.enum.effect, c),
				addItemState: addEffectState
			};
		}
	}) as {
		itemType: 'objective' | 'effect';
		itemFilterFn: (container: Container) => boolean;
		addItemState: Writable<{ target?: Container; iooiType?: IooiType }>;
	};

	const iooiBackgrounds = new Map([
		[iooiTypes.enum['iooi.input'], 'hsl(200, 70%, 95%)'],
		[iooiTypes.enum['iooi.output'], 'hsl(150, 70%, 95%)'],
		[iooiTypes.enum['iooi.outcome'], 'hsl(280, 70%, 95%)'],
		[iooiTypes.enum['iooi.impact'], 'hsl(30, 70%, 95%)']
	]);

	const iooiHoverColors = new Map([
		[iooiTypes.enum['iooi.input'], 'hsl(200, 70%, 50%)'],
		[iooiTypes.enum['iooi.output'], 'hsl(150, 70%, 50%)'],
		[iooiTypes.enum['iooi.outcome'], 'hsl(280, 70%, 50%)'],
		[iooiTypes.enum['iooi.impact'], 'hsl(30, 70%, 50%)']
	]);

	// Define create options for resource data based on container type
	let resourceDataCreateOptions = $derived.by(() => {
		if (isContainerWithPayloadType(payloadTypes.enum.measure, container)) {
			// Measures can have both planned and actual resource allocation
			return [
				{
					value: resourceDataTypes.enum['resource_data_type.planned_resource_allocation'],
					label: $_(resourceDataTypes.enum['resource_data_type.planned_resource_allocation'])
				},
				{
					value: resourceDataTypes.enum['resource_data_type.actual_resource_allocation'],
					label: $_(resourceDataTypes.enum['resource_data_type.actual_resource_allocation'])
				}
			];
		} else {
			// Goals only have budget
			return [
				{
					value: resourceDataTypes.enum['resource_data_type.budget'],
					label: $_(resourceDataTypes.enum['resource_data_type.budget'])
				}
			];
		}
	});

	type IooiItem = Container<ObjectivePayload> | Container<EffectPayload>;

	let items = $derived((containers ?? []).filter(itemFilterFn) as IooiItem[]);
	let resourceData = $derived(
		(containers ?? [])
			.filter((c) => isContainerWithPayloadType(payloadTypes.enum.resource_data, c))
			.filter((rd) =>
				rd.relation.some(
					(r) => r.object === container?.guid && r.predicate === predicates.enum['is-part-of']
				)
			)
	);

	// Items filtered by IOOI type (for output, outcome, impact columns)
	let itemsByIooiType = $derived.by(() => {
		return new Map(
			iooiTypes.options.map((iooiType) => [
				iooiType,
				items.filter((item) => item.payload.iooiType === iooiType)
			])
		);
	});

	function addItemForIooiType(iooiType: IooiType) {
		return async () => {
			if (!container) {
				return;
			}

			const params = new URLSearchParams([
				[overlayKey.enum['indicator-catalog'], ''],
				['alreadyInUse', ''],
				['iooiType', iooiType]
			]);

			if ('sdg' in container.payload) {
				for (const sdg of container.payload.sdg) {
					params.append('sdg', sdg);
				}
			}

			if ('topic' in container.payload) {
				for (const topic of container.payload.topic) {
					params.append('topic', topic);
				}
			}

			addItemState.set({ target: container, iooiType });

			await goto(`#${params.toString()}`);
		};
	}

	function addResourceDataItem() {
		return (selectedType?: string) => {
			if (!container) {
				return;
			}

			// Use selectedType if provided, otherwise determine based on container type
			const resourceDataType =
				selectedType ||
				(isContainerWithPayloadType(payloadTypes.enum.measure, container)
					? resourceDataTypes.enum['resource_data_type.planned_resource_allocation']
					: resourceDataTypes.enum['resource_data_type.budget']);

			// Create new resource_data container
			const item = containerOfType(
				payloadTypes.enum.resource_data,
				container.organization,
				container.organizational_unit,
				container.managed_by,
				container.realm
			) as NewContainer;

			// Set the resourceDataType
			(item.payload as { resourceDataType?: string }).resourceDataType = resourceDataType;

			// Set relations to the parent container
			item.relation = [
				{ object: container.guid, position: 0, predicate: predicates.enum['is-part-of'] }
			];

			$newContainer = item;

			createContainerDialog.getElement().showModal();
		};
	}

	function handleDndConsider(iooiType: IooiType) {
		return (e: CustomEvent<DndEvent<IooiItem>>) => {
			itemsByIooiType.set(iooiType, e.detail.items);
			itemsByIooiType = new Map(itemsByIooiType);
		};
	}

	function handleDndFinalize(iooiType: IooiType) {
		return async (e: CustomEvent<DndEvent<IooiItem>>) => {
			const items = e.detail.items;

			itemsByIooiType.set(iooiType, items);
			itemsByIooiType = new Map(itemsByIooiType);

			if (e.detail.info.trigger === 'droppedIntoZone') {
				const droppedItem = items.find(({ guid }) => guid === e.detail.info.id);

				if (droppedItem && droppedItem.payload.iooiType !== iooiType) {
					droppedItem.payload.iooiType = iooiType;
					const response = await saveContainer(droppedItem);

					if (response.ok) {
						const updatedContainer = await response.json();
						droppedItem.revision = updatedContainer.revision;
					} else {
						const error = await response.json();
						alert(error.message);
					}
				}
			}
		};
	}
</script>

<Board>
	<!-- Impact, Outcome, Output Columns: Display Items -->
	{#each [iooiTypes.enum['iooi.impact'], iooiTypes.enum['iooi.outcome'], iooiTypes.enum['iooi.output']] as iooiType (iooiType)}
		<BoardColumn
			--background={iooiBackgrounds.get(iooiType)}
			--hover-border-color={iooiHoverColors.get(iooiType)}
			addItemUrl={`#create=${itemType}&iooiType=${iooiType}`}
			title={$_(iooiType)}
			onCreateContainer={addItemForIooiType(iooiType)}
		>
			{#if paramsFromFragment(page.url).has('relations')}
				<MaybeDragZone containers={itemsByIooiType.get(iooiType) ?? []}>
					{#snippet itemSnippet(container)}
						<Card
							{container}
							relatedContainers={containers.filter((c) =>
								isContainerWithPayloadType(payloadTypes.enum.indicator, c)
							)}
							showRelationFilter
						/>
					{/snippet}
				</MaybeDragZone>
			{:else if browser && !matchMedia('(pointer: coarse)').matches && $ability.can('update', container)}
				<div
					class="vertical-scroll-wrapper"
					use:dndzone={{ dropTargetStyle: {}, items: itemsByIooiType.get(iooiType) ?? [] }}
					onconsider={handleDndConsider(iooiType)}
					onfinalize={handleDndFinalize(iooiType)}
				>
					{#each itemsByIooiType.get(iooiType) ?? [] as item (item.guid)}
						<Card
							container={item}
							relatedContainers={containers.filter((c) =>
								isContainerWithPayloadType(payloadTypes.enum.indicator, c)
							)}
							showRelationFilter
						/>
					{/each}
				</div>
			{:else}
				<div class="vertical-scroll-wrapper">
					{#each itemsByIooiType.get(iooiType) ?? [] as item (item.guid)}
						<Card
							container={item}
							relatedContainers={containers.filter((c) =>
								isContainerWithPayloadType(payloadTypes.enum.indicator, c)
							)}
							showRelationFilter
						/>
					{/each}
				</div>
			{/if}
		</BoardColumn>
	{/each}

	<!-- Input Column: Display Resource Data -->
	<BoardColumn
		--background={iooiBackgrounds.get(iooiTypes.enum['iooi.input'])}
		--hover-border-color={iooiHoverColors.get(iooiTypes.enum['iooi.input'])}
		addItemUrl="#create=resource_data"
		createOptions={resourceDataCreateOptions}
		title={$_(iooiTypes.enum['iooi.input'])}
		onCreateContainer={addResourceDataItem()}
	>
		<div class="vertical-scroll-wrapper">
			{#each resourceData as rd (rd.guid)}
				<ResourceDataCard container={rd} />
			{/each}
		</div>
	</BoardColumn>
</Board>
