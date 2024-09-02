<script lang="ts">
	import { _ } from 'svelte-i18n';
	import AudienceSelector from '$lib/components/AudienceSelector.svelte';
	import Editor from '$lib/components/Editor.svelte';
	import MeasureRelationSelector from '$lib/components/MeasureRelationSelector.svelte';
	import OrganizationSelector from '$lib/components/OrganizationSelector.svelte';
	import type { EmptyMeasureResultContainer, MeasureResultContainer } from '$lib/models';
	import { applicationState } from '$lib/stores';

	export let container: MeasureResultContainer | EmptyMeasureResultContainer;

	applicationState.update((state) => ({
		...state,
		containerForm: {
			activeTab: 'guid' in container ? 'basic-data' : 'metadata',
			tabs: ['metadata', 'basic-data']
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

	<MeasureRelationSelector {container} />

	<AudienceSelector bind:value={container.payload.audience} />

	<OrganizationSelector bind:container />
</fieldset>
