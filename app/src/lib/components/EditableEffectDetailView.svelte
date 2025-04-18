<script lang="ts">
	import { _ } from 'svelte-i18n';
	import PlusSmall from '~icons/heroicons/plus-small-solid';
	import EditableContainerDetailView from '$lib/components/EditableContainerDetailView.svelte';
	import EffectChart from '$lib/components/EffectChart.svelte';
	import {
		type AnyContainer,
		type Container,
		type EffectContainer,
		isIndicatorContainer,
		predicates
	} from '$lib/models';
	import { applicationState } from '$lib/stores';

	export let container: EffectContainer;
	export let relatedContainers: Container[];
	export let revisions: AnyContainer[];

	$: indicator = relatedContainers
		.filter(isIndicatorContainer)
		.find(
			({ guid }) =>
				container.relation.findIndex(
					({ object, predicate }) =>
						predicate == predicates.enum['is-measured-by'] && object == guid
				) > -1
		);

	$: if (container.payload.achievedValues.length == 0) {
		const thisYear = new Date().getFullYear();
		container.payload = {
			...container.payload,
			achievedValues: [...Array(1)].map((_, index) => [thisYear + index, 0]),
			plannedValues: [...Array(1)].map((_, index) => [thisYear + index, 0])
		};
	}

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

<EditableContainerDetailView {container} {relatedContainers} {revisions} tabs={[]}>
	<svelte:fragment slot="extra">
		{#if indicator}
			<div class="values">
				{#if $applicationState.containerDetailView.editable}
					<table class="spreadsheet">
						<thead>
							<tr>
								<th scope="col"></th>
								<th scope="col" colspan="2">
									{indicator.payload.title} ({$_(indicator.payload.unit ?? '')})
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
							<tr>
								<td colspan="3">
									<button
										class="quiet"
										title={$_('prepend_row')}
										type="button"
										on:click={prependYear}
									>
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
								</tr>
							{/each}
							<tr>
								<td colspan="3">
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
				{/if}

				<EffectChart {container} {relatedContainers} showLegend />
			</div>
		{/if}
	</svelte:fragment>
</EditableContainerDetailView>

<style>
	.values {
		align-items: center;
		display: flex;
		gap: 1rem;
		margin-bottom: 2rem;
	}
</style>
