<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { browser } from '$app/environment';
	import { type DndEvent, dndzone } from 'svelte-dnd-action';
	import saveContainer from '$lib/client/saveContainer';
	import Board from '$lib/components/Board.svelte';
	import BoardColumn from '$lib/components/BoardColumn.svelte';
	import Header from '$lib/components/Header.svelte';
	import Help from '$lib/components/Help.svelte';
	import {
		type Container,
		isObjectiveContainer,
		type ObjectiveContainer,
		type IooiType,
		iooiTypes,
		type GoalContainer,
		overlayKey
	} from '$lib/models';
	import { ability, addObjectiveState } from '$lib/stores';
	import Card from './Card.svelte';
	import { goto, invalidate } from '$app/navigation';

	interface Props {
		container: GoalContainer;
		containers: Container[];
	}

	let { container, containers }: Props = $props();

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

	let objectives = $derived(containers.filter(isObjectiveContainer));

	// Writable derived state for drag-and-drop
	let objectivesByIooiType = $derived.by(() => {
		return new Map(
			iooiTypes.options.map((iooiType) => [
				iooiType,
				objectives.filter((objective) => objective.payload.iooiType === iooiType)
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

			if ('category' in container.payload) {
				for (const category of container.payload.category) {
					params.append('category', category);
				}
			}

			if ('topic' in container.payload) {
				for (const topic of container.payload.topic) {
					params.append('topic', topic);
				}
			}

			$addObjectiveState = { target: container, iooiType };

			await goto(`#${params.toString()}`);
		};
	}

	// Returns a synchronous event handler that updates local state
	function handleDndConsider(iooiType: IooiType) {
		return (e: CustomEvent<DndEvent<ObjectiveContainer>>) => {
			// Reassign the Map entry to trigger Svelte reactivity
			objectivesByIooiType.set(iooiType, e.detail.items);
			// Force Map update by creating new reference
			objectivesByIooiType = new Map(objectivesByIooiType);
		};
	}

	// Returns a synchronous function that itself is async (not a Promise of a function)
	function handleDndFinalize(iooiType: IooiType) {
		return async (e: CustomEvent<DndEvent<ObjectiveContainer>>) => {
			const items = e.detail.items;

			// Update local state
			objectivesByIooiType.set(iooiType, items);
			objectivesByIooiType = new Map(objectivesByIooiType);

			// Save to backend if dropped into different zone
			if (e.detail.info.trigger === 'droppedIntoZone') {
				const droppedItem = items.find(({ guid }) => guid === e.detail.info.id);

				if (droppedItem && droppedItem.payload.iooiType !== iooiType) {
					droppedItem.payload.iooiType = iooiType;
					const response = await saveContainer(droppedItem);

					if (response.ok) {
						const updatedContainer = await response.json();
						droppedItem.revision = updatedContainer.revision;
						await invalidate('containers');
					} else {
						const error = await response.json();
						alert(error.message);
					}
				}
			}
		};
	}
</script>

<Header />

<Board>
	{#each iooiTypes.options as iooiType (iooiType)}
		<BoardColumn
			--background={iooiBackgrounds.get(iooiType)}
			--hover-border-color={iooiHoverColors.get(iooiType)}
			addItemUrl={`#create=objective&iooiType=${iooiType}`}
			title={$_(iooiType)}
			onCreateContainer={addItemForIooiType(iooiType)}
		>
			{#if browser && !matchMedia('(pointer: coarse)').matches && $ability.can('update', container)}
				<div
					class="vertical-scroll-wrapper"
					use:dndzone={{ dropTargetStyle: {}, items: objectivesByIooiType.get(iooiType) ?? [] }}
					onconsider={handleDndConsider(iooiType)}
					onfinalize={handleDndFinalize(iooiType)}
				>
					{#each objectivesByIooiType.get(iooiType) ?? [] as objective (objective.guid)}
						<Card container={objective} />
					{/each}
				</div>
			{:else}
				<div class="vertical-scroll-wrapper">
					{#each objectivesByIooiType.get(iooiType) ?? [] as objective (objective.guid)}
						<Card container={objective} />
					{/each}
				</div>
			{/if}
		</BoardColumn>
	{/each}
</Board>

<Help slug="goals-iooi" />
