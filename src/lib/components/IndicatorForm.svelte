<script lang="ts">
	import { Icon, PlusSmall } from 'svelte-hero-icons';
	import { _ } from 'svelte-i18n';
	import Editor from '$lib/components/Editor.svelte';
	import ListBox from '$lib/components/ListBox.svelte';
	import {
		quantities,
		sustainableDevelopmentGoals,
		topics,
		unitByQuantity,
		units
	} from '$lib/models';
	import type {
		ContainerFormTabKey,
		EmptyIndicatorContainer,
		IndicatorContainer,
		Quantity
	} from '$lib/models';
	import { applicationState } from '$lib/stores';

	export let container: IndicatorContainer | EmptyIndicatorContainer;

	applicationState.update((state) => ({
		...state,
		containerForm: {
			activeTab: 'guid' in container ? 'basic-data' : 'metadata',
			tabs: [
				...('guid' in container ? [] : ['metadata' as ContainerFormTabKey]),
				'basic-data',
				'values'
			]
		}
	}));

	let quantity: string;

	$: if (quantity) {
		container.payload.quantity = quantity;
		container.payload.title = $_(`${quantity}.label`);
		container.payload.unit = unitByQuantity.get(quantity as Quantity);
	}

	$: if (container.payload.historicValues.length === 0) {
		const thisYear = new Date().getFullYear();
		container.payload.historicValues = [...Array(5)].map((_, index) => [thisYear + index - 5, 0]);
	}

	$: if (container.payload.extrapolatedValues.length === 0) {
		const thisYear = new Date().getFullYear();
		container.payload.extrapolatedValues = [...Array(5)].map((_, index) => [thisYear + index, 0]);
	}

	function updateHistoricValues(index: number) {
		return (event: { currentTarget: HTMLInputElement }) => {
			container.payload.historicValues[index][1] = parseFloat(event.currentTarget.value);
		};
	}

	function updateExtrapolatedValues(index: number) {
		return (event: { currentTarget: HTMLInputElement }) => {
			container.payload.extrapolatedValues[index][1] = parseFloat(event.currentTarget.value);
		};
	}

	function prependHistoricValue() {
		const year = container.payload.historicValues[0][0] - 1;
		container.payload.historicValues = [[year, 0], ...container.payload.historicValues];
	}

	function appendExtrapolatedValue() {
		const year =
			container.payload.extrapolatedValues[container.payload.extrapolatedValues.length - 1][0] + 1;
		container.payload.extrapolatedValues = [...container.payload.extrapolatedValues, [year, 0]];
	}
</script>

{#if $applicationState.containerForm.activeTab === 'metadata'}
	<fieldset class="form-tab" id="basic-data">
		<legend>{$_('form.metadata')}</legend>

		<label>
			{$_('indicator.template')}
			<select bind:value={quantity} required>
				<option></option>
				{#each quantities.options as quantityOption}
					<option value={quantityOption}>{$_(`${quantityOption}.label`)}</option>
				{/each}
			</select>
		</label>
	</fieldset>
{:else if $applicationState.containerForm.activeTab === 'basic-data'}
	<label>
		{$_('label.unit')}
		<select name="unit" bind:value={container.payload.unit} disabled>
			{#each units.options as unitOption}
				<option value={unitOption}>{$_(unitOption)}</option>
			{/each}
		</select>
	</label>

	<Editor label={$_('description')} bind:value={container.payload.description} />

	<ListBox
		label={$_('topic.label')}
		options={topics.options}
		bind:value={container.payload.topic}
	/>

	<ListBox
		label={$_('category')}
		options={sustainableDevelopmentGoals.options}
		bind:value={container.payload.category}
	/>
{:else if $applicationState.containerForm.activeTab === 'values'}
	<fieldset class="form-tab" id="values">
		<legend>{$_('form.values')}</legend>

		<table class="spreadsheet">
			<caption>{$_('indicator.historical_values')} ({$_(container.payload.unit ?? '')})</caption>
			<thead>
				<tr>
					<th>
						<button
							class="quiet"
							title={$_('add_column')}
							type="button"
							on:click={prependHistoricValue}
						>
							<Icon src={PlusSmall} size="24" />
						</button>
					</th>
					{#each container.payload.historicValues.map(([k]) => k) as key}
						<th>{key}</th>
					{/each}
				</tr>
			</thead>
			<tbody>
				<tr>
					<td></td>
					{#each container.payload.historicValues.map((v, i) => i) as index}
						<td>
							<input
								type="text"
								inputmode="decimal"
								value={container.payload.historicValues[index][1]}
								on:change={updateHistoricValues(index)}
							/>
						</td>
					{/each}
				</tr>
			</tbody>
		</table>

		<table class="spreadsheet">
			<caption>{$_('indicator.extrapolated_values')} ({$_(container.payload.unit ?? '')})</caption>
			<thead>
				<tr>
					{#each container.payload.extrapolatedValues.map(([k]) => k) as key}
						<th>{key}</th>
					{/each}
					<th>
						<button
							class="quiet"
							title={$_('add_column')}
							type="button"
							on:click={appendExtrapolatedValue}
						>
							<Icon src={PlusSmall} size="24" />
						</button>
					</th>
				</tr>
			</thead>
			<tbody>
				<tr>
					{#each container.payload.extrapolatedValues.map((v, i) => i) as index}
						<td>
							<input
								type="text"
								inputmode="decimal"
								value={container.payload.extrapolatedValues[index][1]}
								on:change={updateExtrapolatedValues(index)}
							/>
						</td>
					{/each}
					<td></td>
				</tr>
			</tbody>
		</table>
	</fieldset>
{/if}
