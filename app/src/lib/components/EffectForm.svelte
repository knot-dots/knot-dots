<script lang="ts">
	import { _ } from 'svelte-i18n';
	import Minus from '~icons/heroicons/minus-solid';
	import PlusSmall from '~icons/heroicons/plus-small-solid';
	import fetchRelatedContainers from '$lib/client/fetchRelatedContainers';
	import EffectChart from '$lib/components/EffectChart.svelte';
	import {
		type EffectContainer,
		isContainerWithEffect,
		isGoalContainer,
		isIndicatorContainer,
		predicates
	} from '$lib/models';
	import { applicationState } from '$lib/stores';

	export let container: EffectContainer;

	applicationState.update((state) => ({
		...state,
		containerForm: {
			tabs: []
		}
	}));

	$: if (container.payload.achievedValues.length == 0) {
		const thisYear = new Date().getFullYear();
		container.payload = {
			...container.payload,
			achievedValues: [...Array(1)].map((_, index) => [thisYear + index, 0]),
			plannedValues: [...Array(1)].map((_, index) => [thisYear + index, 0])
		};
	}

	$: guid = container.guid;
	$: relatedContainerRequest = fetchRelatedContainers(
		guid,
		{ relationType: [predicates.enum['is-measured-by'], predicates.enum['is-part-of']] },
		''
	);

	function appendYear() {
		const year =
			container.payload.achievedValues[container.payload.achievedValues.length - 1][0] + 1;
		container.payload.achievedValues = [...container.payload.achievedValues, [year, 0]];
		container.payload.plannedValues = [...container.payload.plannedValues, [year, 0]];
	}

	function prependYear() {
		const year = container.payload.plannedValues[0][0] - 1;
		container.payload.plannedValues = [[year, 0], ...container.payload.plannedValues];
		container.payload.achievedValues = [[year, 0], ...container.payload.achievedValues];
	}

	function removeYear(index: number) {
		return () => {
			container.payload.plannedValues = [
				...container.payload.plannedValues.slice(0, index),
				...container.payload.plannedValues.slice(index + 1)
			];
			container.payload.achievedValues = [
				...container.payload.achievedValues.slice(0, index),
				...container.payload.achievedValues.slice(index + 1)
			];
		};
	}

	function updateAchievedValues(index: number) {
		return (event: { currentTarget: HTMLInputElement }) => {
			container.payload.achievedValues[index][1] = parseFloat(event.currentTarget.value);
		};
	}

	function updatePlannedValues(index: number) {
		return (event: { currentTarget: HTMLInputElement }) => {
			container.payload.plannedValues[index][1] = parseFloat(event.currentTarget.value);
		};
	}
</script>

<fieldset class="form-tab" id="basic-data">
	<div class="values">
		<table class="spreadsheet">
			<thead>
				<tr>
					<th scope="col"></th>
					<th scope="col" colspan="3">
						{#await relatedContainerRequest then containers}
							{@const indicator = containers
								.filter(isIndicatorContainer)
								.find(
									({ guid }) =>
										container.relation.findIndex(
											({ object, predicate }) =>
												predicate === predicates.enum['is-measured-by'] && object === guid
										) > -1
								)}
							{#if indicator}
								{indicator.payload.title} ({$_(indicator.payload.unit ?? '')})
							{/if}
						{/await}
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
					<th></th>
				</tr>
			</thead>
			<tbody>
				<tr>
					<td colspan="4">
						<button class="quiet" title={$_('prepend_row')} type="button" on:click={prependYear}>
							<PlusSmall />
						</button>
					</td>
				</tr>
				{#each container.payload.achievedValues.map((v, i) => i) as index}
					<tr>
						<th scope="row">
							{container.payload.achievedValues[index][0]}
						</th>
						<td>
							<input
								type="text"
								inputmode="decimal"
								value={container.payload.plannedValues[index][1]}
								on:change={updatePlannedValues(index)}
							/>
						</td>
						<td>
							<input
								type="text"
								inputmode="decimal"
								value={container.payload.achievedValues[index][1]}
								on:change={updateAchievedValues(index)}
							/>
						</td>
						<td>
							{#if index == 0 || index == container.payload.plannedValues.length - 1}
								<button class="quiet" type="button" on:click={removeYear(index)}>
									<Minus />
								</button>
							{/if}
						</td>
					</tr>
				{/each}
				<tr>
					<td colspan="4">
						<button
							class="quiet"
							title={$_('append_row')}
							type="button"
							on:click={() => appendYear()}
						>
							<PlusSmall />
						</button>
					</td>
				</tr>
			</tbody>
		</table>
		{#await relatedContainerRequest then containers}
			{@const indicator = containers.find(isIndicatorContainer)}
			{@const measure = containers.find(isContainerWithEffect)}
			{@const goal = containers.find(isGoalContainer)}
			{#if indicator && measure && goal}
				<EffectChart {container} relatedContainers={[indicator, measure, goal]} showLegend />
			{/if}
		{/await}
	</div>
</fieldset>

<style>
	.values {
		align-items: center;
		display: flex;
		gap: 1rem;
		margin-bottom: 1rem;
	}
</style>
