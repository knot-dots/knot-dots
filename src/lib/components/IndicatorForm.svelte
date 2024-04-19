<script lang="ts">
	import { _ } from 'svelte-i18n';
	import PlusSmall from '~icons/heroicons/plus-small-solid';
	import { page } from '$app/stores';
	import Editor from '$lib/components/Editor.svelte';
	import ListBox from '$lib/components/ListBox.svelte';
	import {
		audience,
		indicatorCategories,
		quantities,
		sustainableDevelopmentGoals,
		topics,
		units
	} from '$lib/models';
	import type {
		ContainerFormTabKey,
		EmptyIndicatorContainer,
		IndicatorCategory,
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

	$: if (container.payload.historicalValues.length === 0) {
		const thisYear = new Date().getFullYear();
		container.payload.historicalValues = [...Array(10)].map((_, index) => [
			thisYear + index - 5,
			0
		]);
	}

	let templateCategory: IndicatorCategory;

	function changeTemplate(event: { currentTarget: HTMLSelectElement }) {
		container.payload.quantity = event.currentTarget.value;

		const indicatorTemplate = $page.data.indicatorTemplates.find(
			({ guid }: IndicatorTemplateContainer) => guid === container.payload.quantity
		);

		if (indicatorTemplate) {
			container.payload.title = indicatorTemplate.payload.title;
			container.payload.unit = indicatorTemplate.payload.unit;
			container.payload.indicatorCategory = indicatorTemplate.payload.indicatorCategory;
			container.payload.description = indicatorTemplate.payload.description;
			container.payload.historicalValuesIntro = indicatorTemplate.payload.historicalValuesIntro;
			container.payload.measuresIntro = indicatorTemplate.payload.measuresIntro;
			container.payload.objectivesIntro = indicatorTemplate.payload.objectivesIntro;
		}
	}

	function createCustomIndicator() {
		templateCategory = indicatorCategories.enum['indicator_category.custom'];

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

{#if !('guid' in container) && !templateCategory}
	<label>
		{$_('indicator_form.select_from_presets')}
		<select class="template-category" bind:value={templateCategory} required>
			<option></option>
			{#each indicatorCategories.options as indicatorCategoryOption}
				{#if indicatorCategoryOption !== indicatorCategories.enum['indicator_category.custom']}
					<option value={indicatorCategoryOption}>{$_(indicatorCategoryOption)}</option>
				{/if}
			{/each}
		</select>
	</label>

	{$_('or')}

	<button class="template-category" type="button" on:click={() => createCustomIndicator()}>
		{$_('indicator_form.create_custom')}
	</button>
{:else}
	<fieldset class="form-tab" id="metadata">
		<legend>{$_('form.metadata')}</legend>

		{#if !container.payload.quantity}
			<label>
				{$_('indicator.template')}
				<select on:change={changeTemplate} required>
					<option></option>
					{#each $page.data.indicatorTemplates as { guid, payload }}
						<option value={guid}>{payload.title}</option>
					{/each}
				</select>
			</label>
		{:else}
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
		{/if}

		<ListBox
			label={$_('audience')}
			options={audience.options}
			bind:value={container.payload.audience}
		/>
	</fieldset>

	<fieldset class="form-tab" id="basic-data">
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

<style>
	.template-category {
		width: fit-content;
	}
</style>
