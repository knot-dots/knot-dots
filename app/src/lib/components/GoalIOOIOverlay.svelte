<script lang="ts">
	import Header from '$lib/components/Header.svelte';
	import Help from '$lib/components/Help.svelte';
	import IOOI from '$lib/components/IOOI.svelte';
	import { type Container, type GoalContainer } from '$lib/models';
	import { addObjectiveState } from '$lib/stores';

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

<IOOI {container} {containers}></IOOI>

<Help slug="goals-iooi" />
