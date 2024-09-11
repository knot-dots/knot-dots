<script lang="ts">
	import { _ } from 'svelte-i18n';
	import PlusSmall from '~icons/heroicons/plus-small-solid';
	import fetchRelatedContainers from '$lib/client/fetchRelatedContainers';
	import Editor from '$lib/components/Editor.svelte';
	import { isIndicatorContainer, type ObjectiveContainer, predicates } from '$lib/models';
	import { applicationState } from '$lib/stores';

	export let container: ObjectiveContainer;

	applicationState.update((state) => ({
		...state,
		containerForm: {
			tabs: []
		}
	}));

	$: guid = container.guid;
	$: relatedContainerRequest = fetchRelatedContainers(guid, {}, '');

	$: if (container.payload.wantedValues.length == 0) {
		const thisYear = new Date().getFullYear();
		container.payload.wantedValues = [...Array(5)].map((_, index) => [thisYear + index, 0]);
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

<fieldset class="form-tab" id="basic-data">
	<div class="values">
		{#await relatedContainerRequest then containers}
			{@const indicator = containers
				.filter(isIndicatorContainer)
				.find(
					({ revision }) =>
						container.relation.findIndex(
							({ object, predicate }) =>
								predicate == predicates.enum['is-objective-for'] && object == revision
						) > -1
				)}
			{#if indicator}
				{@const historicalValuesByYear = new Map(indicator.payload.historicalValues)}
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
								{$_('indicator.wanted_values')}
							</th>
							<th scope="col">
								{$_('indicator.extrapolated_values')}
							</th>
						</tr>
					</thead>
					<tbody>
						<tr>
							<td colspan="2">
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
		{/await}
	</div>

	{#key container.guid}
		<Editor label={$_('description')} bind:value={container.payload.description} />
	{/key}
</fieldset>

<style>
	.values {
		align-items: center;
		display: flex;
		gap: 1rem;
		margin-bottom: 2rem;
	}
</style>
