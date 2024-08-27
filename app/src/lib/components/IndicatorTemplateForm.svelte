<script lang="ts">
	import { _ } from 'svelte-i18n';
	import Editor from '$lib/components/Editor.svelte';
	import ListBox from '$lib/components/ListBox.svelte';
	import {
		audience,
		indicatorCategories,
		indicatorTypes,
		measureTypes,
		sustainableDevelopmentGoals,
		topics,
		units
	} from '$lib/models';
	import type { ContainerFormTabKey, IndicatorTemplateContainer } from '$lib/models';
	import { ability, applicationState } from '$lib/stores';

	export let container: IndicatorTemplateContainer;

	applicationState.update((state) => ({
		...state,
		containerForm: {
			activeTab: 'guid' in container ? 'basic-data' : 'metadata',
			tabs: [...('guid' in container ? [] : ['metadata' as ContainerFormTabKey]), 'basic-data']
		}
	}));
</script>

<fieldset class="form-tab" id="basic-data">
	<label>
		{$_('label.unit')}
		<select name="unit" bind:value={container.payload.unit}>
			{#each units.options as unitOption}
				<option value={unitOption}>{$_(unitOption)}</option>
			{/each}
		</select>
	</label>

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
</fieldset>

<fieldset class="form-tab" id="metadata">
	<legend>{$_('form.metadata')}</legend>

	<ListBox
		label={$_('indicator_type')}
		options={indicatorTypes.options.map((o) => ({ value: o, label: $_(o) }))}
		bind:value={container.payload.indicatorType}
	/>

	{#if $ability.can('update', container, 'indicatorCategory')}
		<ListBox
			label={$_('indicator_category')}
			options={indicatorCategories.options.map((o) => ({ value: o, label: $_(o) }))}
			bind:value={container.payload.indicatorCategory}
		/>
	{/if}

	<ListBox
		label={$_('measure_type')}
		options={measureTypes.options.map((o) => ({ value: o, label: $_(o) }))}
		bind:value={container.payload.measureType}
	/>

	<ListBox
		label={$_('topic.label')}
		options={topics.options.map((o) => ({ value: o, label: $_(o) }))}
		bind:value={container.payload.topic}
	/>

	<ListBox
		label={$_('category')}
		options={sustainableDevelopmentGoals.options.map((o) => ({ value: o, label: $_(o) }))}
		bind:value={container.payload.category}
	/>

	<ListBox
		label={$_('audience')}
		options={audience.options.map((o) => ({ value: o, label: $_(o) }))}
		bind:value={container.payload.audience}
	/>
</fieldset>
