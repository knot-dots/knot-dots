<script lang="ts">
	import { _ } from 'svelte-i18n';
	import PlusSmall from '~icons/heroicons/plus-small-solid';
	import Editor from '$lib/components/Editor.svelte';
	import IndicatorTemplates from '$lib/components/IndicatorTemplates.svelte';
	import ListBox from '$lib/components/ListBox.svelte';
	import {
		audience,
		hasHistoricalValues,
		indicatorCategories,
		indicatorTypes,
		measureTypes,
		quantities,
		sustainableDevelopmentGoals,
		topics,
		units
	} from '$lib/models';
	import type {
		ContainerFormTabKey,
		EmptyIndicatorContainer,
		IndicatorContainer,
		IndicatorTemplateContainer
	} from '$lib/models';
	import { ability, applicationState } from '$lib/stores';

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

	let withHistoricalValues = false;

	$: if (withHistoricalValues && !hasHistoricalValues(container)) {
		const thisYear = new Date().getFullYear();
		container.payload.historicalValues = [...Array(10)].map((_, index) => [
			thisYear + index - 5,
			0
		]);
	} else if (!withHistoricalValues && hasHistoricalValues(container)) {
		container.payload.historicalValues = [];
	}

	let indicatorTemplate: IndicatorTemplateContainer;

	$: if (indicatorTemplate) {
		container.payload = {
			...indicatorTemplate.payload,
			historicalValues: container.payload.historicalValues,
			quantity: indicatorTemplate.guid,
			type: container.payload.type
		};
	}

	function createCustomIndicator() {
		container.payload.quantity = quantities.enum['quantity.custom'];
		container.payload.title = '';
		container.payload.indicatorCategory = [indicatorCategories.enum['indicator_category.custom']];
	}

	function updateHistoricalValues(index: number) {
		return (event: { currentTarget: HTMLInputElement }) => {
			if (
				container.payload.historicalValues
					.slice(index)
					.every(([, value]) => value == container.payload.historicalValues[index][1])
			) {
				for (let i = index; i < container.payload.historicalValues.length; i++) {
					container.payload.historicalValues[i][1] = parseFloat(event.currentTarget.value);
				}
			} else {
				container.payload.historicalValues[index][1] = parseFloat(event.currentTarget.value);
			}
		};
	}

	function prependHistoricalValue() {
		const year = container.payload.historicalValues[0][0] - 1;
		container.payload.historicalValues = [[year, 0], ...container.payload.historicalValues];
	}

	function appendHistoricalValue() {
		const year =
			container.payload.historicalValues[container.payload.historicalValues.length - 1][0] + 1;
		container.payload.historicalValues = [...container.payload.historicalValues, [year, 0]];
	}
</script>

{#if !container.payload.quantity}
	<button class="template-category" type="button" on:click={() => createCustomIndicator()}>
		<PlusSmall />
		{$_('indicator_form.create_custom')}
	</button>
	<IndicatorTemplates bind:value={indicatorTemplate} />
{:else}
	<fieldset class="form-tab" id="metadata">
		<legend>{$_('form.metadata')}</legend>

		<ListBox
			label={$_('indicator_type')}
			options={indicatorTypes.options}
			bind:value={container.payload.indicatorType}
		/>

		<label>
			{$_('label.unit')}
			<select
				name="unit"
				bind:value={container.payload.unit}
				disabled={container.payload.quantity !== quantities.enum['quantity.custom']}
			>
				{#each units.options as unitOption}
					<option value={unitOption}>{$_(unitOption)}</option>
				{/each}
			</select>
		</label>

		<ListBox
			label={$_('audience')}
			options={audience.options}
			bind:value={container.payload.audience}
		/>
	</fieldset>

	<fieldset class="form-tab" id="basic-data">
		<legend>{$_('form.basic_data')}</legend>

		{#key 'guid' in container ? container.guid : ''}
			<Editor label={$_('description')} bind:value={container.payload.description} />

			<Editor
				label={$_('indicator.historical_values_intro')}
				bind:value={container.payload.historicalValuesIntro}
			/>

			<Editor
				label={$_('indicator.objectives_intro')}
				bind:value={container.payload.objectivesIntro}
			/>

			<Editor label={$_('indicator.measures_intro')} bind:value={container.payload.measuresIntro} />
		{/key}

		{#if $ability.can('update', container, 'indicatorCategory')}
			<ListBox
				label={$_('indicator_category')}
				options={indicatorCategories.options}
				bind:value={container.payload.indicatorCategory}
			/>
		{/if}

		<ListBox
			label={$_('measure_type')}
			options={measureTypes.options}
			bind:value={container.payload.measureType}
		/>

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
	</fieldset>

	{#if withHistoricalValues}
		<fieldset class="form-tab" id="historical-values">
			<legend>{$_('form.historical_values')}</legend>

			<table class="spreadsheet">
				<thead>
					<tr>
						<th scope="col"></th>
						<th scope="col">
							{$_(container.payload.unit ?? '')}
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
								on:click={prependHistoricalValue}
							>
								<PlusSmall />
							</button>
						</td>
					</tr>
					{#each container.payload.historicalValues.map((v, i) => i) as index}
						<tr>
							<th scope="row">
								{container.payload.historicalValues[index][0]}
							</th>
							<td>
								<input
									type="text"
									inputmode="decimal"
									value={container.payload.historicalValues[index][1]}
									on:change={updateHistoricalValues(index)}
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
								on:click={appendHistoricalValue}
							>
								<PlusSmall />
							</button>
						</td>
					</tr>
				</tbody>
			</table>
		</fieldset>
	{/if}
{/if}

<style>
	.template-category {
		width: fit-content;
	}
</style>
