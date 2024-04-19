<script lang="ts">
	import { onMount } from 'svelte';
	import { _ } from 'svelte-i18n';
	import MinusSmall from '~icons/heroicons/minus-small-solid';
	import PlusSmall from '~icons/heroicons/plus-small-solid';
	import fetchContainers from '$lib/client/fetchContainers';
	import IndicatorChart from '$lib/components/IndicatorChart.svelte';
	import { payloadTypes } from '$lib/models';
	import type { Container, EmptyContainer, IndicatorContainer, IndicatorEffect } from '$lib/models';

	export let container: (Container | EmptyContainer) & {
		payload: { effect: IndicatorEffect[] };
	};

	let indicatorsRequest: Promise<IndicatorContainer[]> = new Promise(() => []);

	onMount(() => {
		indicatorsRequest = fetchContainers({
			organization: [container.organization],
			payloadType: [payloadTypes.enum.indicator]
		}) as Promise<IndicatorContainer[]>;
	});

	let showIndicatorOptions = false;

	function add(event: { currentTarget: HTMLSelectElement }) {
		showIndicatorOptions = false;
		const thisYear = new Date().getFullYear();
		container.payload.effect = [
			...(container.payload.effect ?? []),
			{
				indicator: event.currentTarget.value,
				achievedValues: [...Array(5)].map((_, index) => [thisYear + index, 0]),
				plannedValues: [...Array(5)].map((_, index) => [thisYear + index, 0])
			}
		];
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

	function compareIndicators(a: IndicatorContainer, b: IndicatorContainer) {
		if (container.organizational_unit == null) {
			if (a.organizational_unit != null && b.organizational_unit == null) {
				return 1;
			} else if (a.organizational_unit == null && b.organizational_unit != null) {
				return -1;
			} else {
				return a.payload.title.localeCompare(b.payload.title);
			}
		} else {
			if (
				a.organizational_unit == container.organizational_unit &&
				b.organizational_unit != container.organizational_unit
			) {
				return 1;
			} else if (
				a.organizational_unit != container.organizational_unit &&
				b.organizational_unit == container.organizational_unit
			) {
				return -1;
			} else {
				return a.payload.title.localeCompare(b.payload.title);
			}
		}
	}
</script>

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
								{$_(`${indicator.payload.quantity}.label`)} ({$_(
									`${indicator.payload.unit}` ?? ''
								)})
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

	{#if showIndicatorOptions}
		<label>
			<select name="indicator" on:change={add} required>
				<option></option>
				{#each indicators.sort(compareIndicators) as indicatorOption}
					<option value={indicatorOption.guid}>
						{indicatorOption.payload.title}
					</option>
				{/each}
			</select>
		</label>
	{:else}
		<p>
			<button type="button" on:click={() => (showIndicatorOptions = true)}>
				<PlusSmall />
				{$_('indicator.effect')}
			</button>
		</p>
	{/if}
{/await}

<style>
	.effect {
		align-items: center;
		display: flex;
		gap: 1rem;
		margin-bottom: 1rem;
	}
</style>
