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
				'historical-values'
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
		container.payload.historicValues = [...Array(10)].map((_, index) => [thisYear + index - 5, 0]);
	}

	function updateHistoricValues(index: number) {
		return (event: { currentTarget: HTMLInputElement }) => {
			container.payload.historicValues[index][1] = parseFloat(event.currentTarget.value);
		};
	}

	function prependHistoricValue() {
		const year = container.payload.historicValues[0][0] - 1;
		container.payload.historicValues = [[year, 0], ...container.payload.historicValues];
	}

	function appendHistoricValue() {
		const year =
			container.payload.historicValues[container.payload.historicValues.length - 1][0] + 1;
		container.payload.historicValues = [...container.payload.historicValues, [year, 0]];
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
{:else if $applicationState.containerForm.activeTab === 'historical-values'}
	<fieldset class="form-tab" id="historical-values">
		<legend>{$_('form.historical_values')}</legend>

		<table class="spreadsheet">
			<thead>
				<tr>
					<th scope="col"></th>
					<th scope="col">
						{$_(`${container.payload.quantity}.label`)} ({$_(container.payload.unit ?? '')})
					</th>
				</tr>
			</thead>
			<tbody>
				<tr>
					<td colspan="2">
						<button
							class="quiet"
							title={$_('add_value')}
							type="button"
							on:click={prependHistoricValue}
						>
							<Icon src={PlusSmall} size="24" />
						</button>
					</td>
				</tr>
				{#each container.payload.historicValues.map((v, i) => i) as index}
					<tr>
						<th scope="row">
							{container.payload.historicValues[index][0]}
						</th>
						<td>
							<input
								type="text"
								inputmode="decimal"
								value={container.payload.historicValues[index][1]}
								on:change={updateHistoricValues(index)}
							/>
						</td>
					</tr>
				{/each}
				<tr>
					<td colspan="2">
						<button
							class="quiet"
							title={$_('add_value')}
							type="button"
							on:click={appendHistoricValue}
						>
							<Icon src={PlusSmall} size="24" />
						</button>
					</td>
				</tr>
			</tbody>
		</table>
	</fieldset>
{/if}
