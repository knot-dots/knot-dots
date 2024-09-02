<script lang="ts">
	import { _ } from 'svelte-i18n';
	import AudienceSelector from '$lib/components/AudienceSelector.svelte';
	import CategorySelector from '$lib/components/CategorySelector.svelte';
	import Editor from '$lib/components/Editor.svelte';
	import OrganizationSelector from '$lib/components/OrganizationSelector.svelte';
	import StrategyRelationSelector from '$lib/components/StrategyRelationSelector.svelte';
	import TopicSelector from '$lib/components/TopicSelector.svelte';
	import type { EmptyVisionContainer, VisionContainer } from '$lib/models';
	import { applicationState } from '$lib/stores';

	export let container: VisionContainer | EmptyVisionContainer;

	applicationState.update((state) => ({
		...state,
		containerForm: {
			activeTab: 'basic-data',
			tabs: ['basic-data', 'metadata']
		}
	}));
</script>

<fieldset class="form-tab" id="basic-data">
	<label>
		{$_('summary')}
		<textarea name="summary" maxlength="200" bind:value={container.payload.summary} />
	</label>

	{#key 'guid' in container ? container.guid : ''}
		<Editor label={$_('description')} bind:value={container.payload.description} />
	{/key}
</fieldset>

<fieldset class="form-tab" id="metadata">
	<legend>{$_('form.metadata')}</legend>

	<StrategyRelationSelector {container} />

	<TopicSelector bind:value={container.payload.topic} />

	<CategorySelector bind:value={container.payload.category} />

	<AudienceSelector bind:value={container.payload.audience} />

	<OrganizationSelector bind:container />
</fieldset>
