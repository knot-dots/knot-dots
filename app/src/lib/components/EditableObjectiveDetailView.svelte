<script lang="ts">
	import { _ } from 'svelte-i18n';
	import PlusSmall from '~icons/heroicons/plus-small-solid';
	import EditableContainerDetailView from '$lib/components/EditableContainerDetailView.svelte';
	import EditableFormattedText from '$lib/components/EditableFormattedText.svelte';
	import ObjectiveChart from '$lib/components/ObjectiveChart.svelte';
	import {
		type AnyContainer,
		type Container,
		isIndicatorContainer,
		type ObjectiveContainer,
		predicates
	} from '$lib/models';
	import { applicationState } from '$lib/stores';

	export let container: ObjectiveContainer;
	export let relatedContainers: Container[];
	export let revisions: AnyContainer[];

	$: indicator = relatedContainers
		.filter(isIndicatorContainer)
		.find(
			({ guid }) =>
				container.relation.findIndex(
					({ object, predicate }) =>
						predicate == predicates.enum['is-objective-for'] && object == guid
				) > -1
		);

	$: if (container.payload.wantedValues.length == 0) {
		const thisYear = new Date().getFullYear();
		container.payload.wantedValues = [...Array(1)].map((_, index) => [thisYear + index, 0]);
	}

	function appendWantedValue() {
		const year = container.payload.wantedValues[container.payload.wantedValues.length - 1][0] + 1;
		container.payload.wantedValues = [...container.payload.wantedValues, [year, 0]];
	}

	function prependWantedValue() {
		const year = container.payload.wantedValues[0][0] - 1;
		container.payload.wantedValues = [[year, 0], ...container.payload.wantedValues];
	}

	function updateWantedValues(index: number) {
		return (event: { currentTarget: HTMLInputElement }) => {
			container.payload.wantedValues[index][1] = parseFloat(event.currentTarget.value);
		};
	}
</script>

<EditableContainerDetailView {container} {relatedContainers} {revisions} tabs={[]}>
	<svelte:fragment slot="data">
		{#if indicator}
			<div class="values">
				{#if $applicationState.containerDetailView.editable}
					{@const historicalValuesByYear = new Map(indicator.payload.historicalValues)}
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
									{$_('indicator.wanted_values')}
								</th>
								<th scope="col">
									{$_('indicator.extrapolated_values')}
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
										on:click={prependWantedValue}
									>
										<PlusSmall />
									</button>
								</td>
							</tr>
							{#each container.payload.wantedValues.map((v, i) => i) as index}
								<tr>
									<th scope="row">
										{container.payload.wantedValues[index][0]}
									</th>
									<td>
										<input
											type="text"
											inputmode="decimal"
											value={container.payload.wantedValues[index][1]}
											on:change={updateWantedValues(index)}
										/>
									</td>
									<td>
										<input
											tabindex="-1"
											type="text"
											value={historicalValuesByYear.get(container.payload.wantedValues[index][0]) ??
												''}
											readonly
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
										on:click={() => appendWantedValue()}
									>
										<PlusSmall />
									</button>
								</td>
							</tr>
						</tbody>
					</table>
				{/if}

				<ObjectiveChart {container} {relatedContainers} />
			</div>
		{/if}

		<EditableFormattedText
			editable={$applicationState.containerDetailView.editable}
			label={$_('description')}
			bind:value={container.payload.description}
		/>
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
