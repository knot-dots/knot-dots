<script lang="ts">
	import { type DndEvent, dndzone } from 'svelte-dnd-action';
	import { _ } from 'svelte-i18n';
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import type { Writable } from 'svelte/store';
	import saveContainer from '$lib/client/saveContainer';
	import Board from '$lib/components/Board.svelte';
	import BoardColumn from '$lib/components/BoardColumn.svelte';
	import Card from '$lib/components/Card.svelte';
	import {
		type Container,
		type EffectContainer,
		type GoalContainer,
		type IooiType,
		iooiTypes,
		isEffectContainer,
		isGoalContainer,
		isMeasureContainer,
		isObjectiveContainer,
		isResourceDataContainer,
		type MeasureContainer,
		type ObjectiveContainer,
		overlayKey
	} from '$lib/models';
	import { ability, addEffectState, addObjectiveState } from '$lib/stores';
	import ResourceDataCard from './ResourceDataCard.svelte';

	interface Props {
		container: GoalContainer | MeasureContainer;
		containers: Container[];
	}

	let { container, containers }: Props = $props();

	const { itemType, itemFilterFn, addItemState } = $derived.by(() => {
		if (isGoalContainer(container)) {
			return {
				itemType: 'objective' as const,
				itemFilterFn: isObjectiveContainer,
				addItemState: addObjectiveState
			};
		} else if (isMeasureContainer(container)) {
			return {
				itemType: 'effect' as const,
				itemFilterFn: isEffectContainer,
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

	type IooiItem = ObjectiveContainer | EffectContainer;

	let items = $derived((containers ?? []).filter(itemFilterFn) as IooiItem[]);
	let resourceData = $derived((containers ?? []).filter(isResourceDataContainer));

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

			addItemState.set({ target: container, iooiType });

			await goto(`#${params.toString()}`);
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
	<!-- Input Column: Display Resource Data -->
	<BoardColumn
		--background={iooiBackgrounds.get(iooiTypes.enum['iooi.input'])}
		--hover-border-color={iooiHoverColors.get(iooiTypes.enum['iooi.input'])}
		title={$_(iooiTypes.enum['iooi.input'])}
	>
		<div class="vertical-scroll-wrapper">
			{#each resourceData as rd (rd.guid)}
				<ResourceDataCard container={rd} />
			{/each}
		</div>
	</BoardColumn>

	<!-- Output, Outcome, Impact Columns: Display Items -->
	{#each [iooiTypes.enum['iooi.output'], iooiTypes.enum['iooi.outcome'], iooiTypes.enum['iooi.impact']] as iooiType (iooiType)}
		<BoardColumn
			--background={iooiBackgrounds.get(iooiType)}
			--hover-border-color={iooiHoverColors.get(iooiType)}
			addItemUrl={`#create=${itemType}&iooiType=${iooiType}`}
			title={$_(iooiType)}
			onCreateContainer={addItemForIooiType(iooiType)}
		>
			{#if browser && !matchMedia('(pointer: coarse)').matches && $ability.can('update', container)}
				<div
					class="vertical-scroll-wrapper"
					use:dndzone={{ dropTargetStyle: {}, items: itemsByIooiType.get(iooiType) ?? [] }}
					onconsider={handleDndConsider(iooiType)}
					onfinalize={handleDndFinalize(iooiType)}
				>
					{#each itemsByIooiType.get(iooiType) ?? [] as item (item.guid)}
						<Card container={item} />
					{/each}
				</div>
			{:else}
				<div class="vertical-scroll-wrapper">
					{#each itemsByIooiType.get(iooiType) ?? [] as item (item.guid)}
						<Card container={item} />
					{/each}
				</div>
			{/if}
		</BoardColumn>
	{/each}
</Board>
