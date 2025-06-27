<script lang="ts">
	import { getContext } from 'svelte';
	import { _ } from 'svelte-i18n';
	import PlusSmall from '~icons/heroicons/plus-small-solid';
	import { page } from '$app/state';
	import { env } from '$env/dynamic/public';
	import AudienceSelector from '$lib/components/AudienceSelector.svelte';
	import CategorySelector from '$lib/components/CategorySelector.svelte';
	import Editor from '$lib/components/Editor.svelte';
	import IndicatorCategorySelector from '$lib/components/IndicatorCategorySelector.svelte';
	import IndicatorTemplates from '$lib/components/IndicatorTemplates.svelte';
	import IndicatorTypeSelector from '$lib/components/IndicatorTypeSelector.svelte';
	import MeasureTypeSelector from '$lib/components/MeasureTypeSelector.svelte';
	import PolicyFieldBNKSelector from '$lib/components/PolicyFieldBNKSelector.svelte';
	import TopicSelector from '$lib/components/TopicSelector.svelte';
	import UnitSelector from '$lib/components/UnitSelector.svelte';
	import {
		containerOfType,
		type EmptyIndicatorContainer,
		hasHistoricalValues,
		indicatorCategories,
		type IndicatorContainer,
		type IndicatorTemplateContainer,
		type NewContainer,
		payloadTypes,
		quantities,
		units
	} from '$lib/models';
	import { ability, newContainer } from '$lib/stores';

	export let container: IndicatorContainer | EmptyIndicatorContainer;

	let withHistoricalValues = 'guid' in container ? hasHistoricalValues(container) : false;

	$: if (withHistoricalValues && !hasHistoricalValues(container)) {
		const thisYear = new Date().getFullYear();
		container.payload.historicalValues = [...Array(1)].map((_, index) => [thisYear + index, 0]);
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

	const createContainerDialog = getContext<{ getElement: () => HTMLDialogElement }>(
		'createContainerDialog'
	);

	function createCustomIndicator() {
		const container = containerOfType(
			payloadTypes.enum.indicator,
			page.data.currentOrganization.guid,
			page.data.currentOrganizationalUnit?.guid ?? null,
			page.data.currentOrganizationalUnit?.guid ?? page.data.currentOrganization.guid,
			env.PUBLIC_KC_REALM as string
		) as NewContainer & EmptyIndicatorContainer;

		container.payload.quantity = quantities.enum['quantity.custom'];
		container.payload.title = '';
		container.payload.unit = units.enum['unit.cubic_meter'];
		container.payload.indicatorCategory = [indicatorCategories.enum['indicator_category.custom']];

		$newContainer = container;

		createContainerDialog.getElement().showModal();
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
	<div class="form-tab">
		<button class="template-category" type="button" on:click={() => createCustomIndicator()}>
			<PlusSmall />
			{$_('indicator_form.create_custom')}
		</button>
		<IndicatorTemplates bind:value={indicatorTemplate} />
	</div>
{:else}
	<fieldset class="form-tab" id="basic-data">
		<UnitSelector bind:value={container.payload.unit} />

		<label>
			<input
				class="toggle"
				type="checkbox"
				bind:checked={withHistoricalValues}
				disabled={'guid' in container && hasHistoricalValues(container)}
			/>
			{$_('indicator_form.with_historical_values')}
		</label>

		{#key 'guid' in container ? container.guid : ''}
			<Editor label={$_('description')} bind:value={container.payload.description} />
		{/key}
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

	<fieldset class="form-tab" id="metadata">
		<legend>{$_('form.metadata')}</legend>

		<IndicatorTypeSelector bind:value={container.payload.indicatorType} />

		{#if $ability.can('update', container, 'indicatorCategory')}
			<IndicatorCategorySelector bind:value={container.payload.indicatorCategory} />
		{/if}

		<MeasureTypeSelector bind:value={container.payload.measureType} />

		<TopicSelector bind:value={container.payload.topic} />

		<PolicyFieldBNKSelector bind:value={container.payload.policyFieldBNK} />

		<CategorySelector bind:value={container.payload.category} />

		<AudienceSelector bind:value={container.payload.audience} />
	</fieldset>
{/if}

<style>
	.template-category {
		width: fit-content;
	}
</style>
