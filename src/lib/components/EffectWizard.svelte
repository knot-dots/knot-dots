<script lang="ts">
	import { onMount } from 'svelte';
	import type { Action } from 'svelte/action';
	import { _ } from 'svelte-i18n';
	import MinusSmall from '~icons/heroicons/minus-small-solid';
	import PlusSmall from '~icons/heroicons/plus-small-solid';
	import { goto } from '$app/navigation';
	import fetchContainers from '$lib/client/fetchContainers';
	import IndicatorChart from '$lib/components/IndicatorChart.svelte';
	import {
		type Container,
		type EmptyContainer,
		type IndicatorContainer,
		type IndicatorEffect,
		type MeasureType,
		overlayKey,
		payloadTypes,
		type SustainableDevelopmentGoal,
		type Topic
	} from '$lib/models';
	import { addEffectState } from '$lib/stores';

	export let container: (Container | EmptyContainer) & {
		payload: {
			category: SustainableDevelopmentGoal[];
			effect: IndicatorEffect[];
			measureType: MeasureType[];
			topic: Topic[];
		};
	};

	let scrollToEffects = false;

	const scroll: Action<HTMLParagraphElement> = () => {
		if (scrollToEffects) {
			document.getElementById('effects')?.scrollIntoView({ behavior: 'instant', block: 'end' });
		}
	};

	let indicatorsRequest: Promise<IndicatorContainer[]> = new Promise(() => []);

	onMount(() => {
		if (
			'guid' in container &&
			$addEffectState.target?.guid == container.guid &&
			$addEffectState.effect
		) {
			const thisYear = new Date().getFullYear();
			container.payload.effect = [
				...container.payload.effect,
				{
					indicator: $addEffectState.effect.guid,
					achievedValues: [...Array(5)].map((_, index) => [thisYear + index, 0]),
					plannedValues: [...Array(5)].map((_, index) => [thisYear + index, 0])
				}
			];

			scrollToEffects = true;
		}

		$addEffectState = {};

		indicatorsRequest = fetchContainers({
			organization: [container.organization],
			payloadType: [payloadTypes.enum.indicator]
		}) as Promise<IndicatorContainer[]>;
	});

	async function add(target: Container) {
		const params = new URLSearchParams([
			[overlayKey.enum.create, payloadTypes.enum.indicator],
			['alreadyInUse', '']
		]);

		for (const category of container.payload.category) {
			params.append('category', category);
		}

		for (const topic of container.payload.topic) {
			params.append('topic', topic);
		}

		for (const measureType of container.payload.measureType) {
			params.append('measureType', measureType);
		}

		$addEffectState = { target };

		await goto(`#${params.toString()}`);
	}

	function remove(i: number) {
		return () => {
			if (container.payload.effect) {
				container.payload.effect = [
					...container.payload.effect.slice(0, i),
					...container.payload.effect.slice(i + 1)
				];
			}
		};
	}

	function appendYear(effectIndex: number) {
		const effect = container.payload.effect[effectIndex];
		const year = effect.achievedValues[effect.achievedValues.length - 1][0] + 1;
		container.payload.effect[effectIndex].achievedValues = [...effect.achievedValues, [year, 0]];
		container.payload.effect[effectIndex].plannedValues = [...effect.plannedValues, [year, 0]];
	}

	function updateAchievedValues(effectIndex: number, index: number) {
		return (event: { currentTarget: HTMLInputElement }) => {
			container.payload.effect[effectIndex].achievedValues[index][1] = parseFloat(
				event.currentTarget.value
			);
		};
	}

	function updatePlannedValues(effectIndex: number, index: number) {
		return (event: { currentTarget: HTMLInputElement }) => {
			container.payload.effect[effectIndex].plannedValues[index][1] = parseFloat(
				event.currentTarget.value
			);
		};
	}
</script>

<fieldset>
	{#await indicatorsRequest then indicators}
		{@const indicatorsByGuid = new Map(indicators.map((container) => [container.guid, container]))}

		{#each container.payload.effect ?? [] as effect, effectIndex}
			{@const indicator = indicatorsByGuid.get(effect.indicator)}
			{#if indicator}
				<div class="effect">
					<table class="spreadsheet">
						<thead>
							<tr>
								<th scope="col"></th>
								<th scope="col" colspan="2">
									{indicator.payload.title} ({$_(`${indicator.payload.unit}` ?? '')})
								</th>
							</tr>
							<tr>
								<th scope="col"></th>
								<th scope="col">
									{$_('indicator.effect.planned_values')}
								</th>
								<th scope="col">
									{$_('indicator.effect.achieved_values')}
								</th>
							</tr>
						</thead>
						<tbody>
							{#each effect.achievedValues.map((v, i) => i) as index}
								<tr>
									<th scope="row">
										{effect.achievedValues[index][0]}
									</th>
									<td>
										<input
											type="text"
											inputmode="decimal"
											value={effect.plannedValues[index][1]}
											on:change={updatePlannedValues(effectIndex, index)}
										/>
									</td>
									<td>
										<input
											type="text"
											inputmode="decimal"
											value={effect.achievedValues[index][1]}
											on:change={updateAchievedValues(effectIndex, index)}
										/>
									</td>
								</tr>
							{/each}

							<tr>
								<td colspan="3">
									<button
										class="quiet"
										title={$_('add_value')}
										type="button"
										on:click={() => appendYear(effectIndex)}
									>
										<PlusSmall />
									</button>
								</td>
							</tr>
						</tbody>
					</table>
					{#if 'guid' in container}
						<IndicatorChart container={indicator} relatedContainers={[container]} showEffects />
					{/if}
					<button type="button" on:click={remove(effectIndex)}>
						<MinusSmall />
					</button>
				</div>
			{/if}
		{/each}
		{#if 'guid' in container}
			<p use:scroll>
				<button type="button" on:click={() => add(container)}>
					<PlusSmall />
					{$_('effect')}
				</button>
			</p>
		{/if}
	{/await}
</fieldset>

<style>
	.effect {
		align-items: center;
		display: flex;
		gap: 1rem;
		margin-bottom: 1rem;
	}
</style>
