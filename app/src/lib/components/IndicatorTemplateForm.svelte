<script lang="ts">
	import { _ } from 'svelte-i18n';
	import AudienceSelector from '$lib/components/AudienceSelector.svelte';
	import CategorySelector from '$lib/components/CategorySelector.svelte';
	import Editor from '$lib/components/Editor.svelte';
	import IndicatorCategorySelector from '$lib/components/IndicatorCategorySelector.svelte';
	import IndicatorTypeSelector from '$lib/components/IndicatorTypeSelector.svelte';
	import MeasureTypeSelector from '$lib/components/MeasureTypeSelector.svelte';
	import PolicyFieldBNKSelector from '$lib/components/PolicyFieldBNKSelector.svelte';
	import TopicSelector from '$lib/components/TopicSelector.svelte';
	import UnitSelector from '$lib/components/UnitSelector.svelte';
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
	<UnitSelector bind:value={container.payload.unit} />

	{#key 'guid' in container ? container.guid : ''}
		<Editor label={$_('description')} bind:value={container.payload.description} />
	{/key}
</fieldset>

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
