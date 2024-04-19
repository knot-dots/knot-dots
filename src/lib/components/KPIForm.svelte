<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { page } from '$app/stores';
	import paramsFromURL from '$lib/client/paramsFromURL';
	import Editor from '$lib/components/Editor.svelte';
	import EffectWizard from '$lib/components/EffectWizard.svelte';
	import ListBox from '$lib/components/ListBox.svelte';
	import OrganizationSelector from '$lib/components/OrganizationSelector.svelte';
	import StrategyRelationSelector from '$lib/components/StrategyRelationSelector.svelte';
	import { audience, type EmptyKPIContainer, type KPIContainer, status } from '$lib/models';
	import { applicationState } from '$lib/stores';

	export let container: KPIContainer | EmptyKPIContainer;

	applicationState.update((state) => ({
		...state,
		containerForm: {
			activeTab: 'guid' in container ? 'basic-data' : 'metadata',
			tabs: ['metadata', 'basic-data', 'effects']
		}
	}));

	let statusParam = paramsFromURL($page.url).get('status') ?? status.enum['status.idea'];
</script>

<fieldset class="form-tab" id="metadata">
	<legend>{$_('form.metadata')}</legend>

	<StrategyRelationSelector {container} />

	<OrganizationSelector bind:container />

	<ListBox
		label={$_('audience')}
		options={audience.options}
		bind:value={container.payload.audience}
	/>
</fieldset>

<fieldset class="form-tab" id="basic-data">
	<legend>{$_('form.basic_data')}</legend>

	<label>
		{$_('summary')}
		<textarea name="summary" maxlength="200" bind:value={container.payload.summary} />
	</label>

	{#key 'guid' in container ? container.guid : ''}
		<Editor label={$_('description')} bind:value={container.payload.description} />
	{/key}

	<label>
		{$_('status.label')}
		<select name="status" bind:value={container.payload.status} required>
			{#each status.options as statusOption}
				<option value={statusOption} selected={statusOption === statusParam}>
					{$_(statusOption)}
				</option>
			{/each}
		</select>
	</label>

	<label>
		{$_('fulfillment_date')}
		<input type="date" bind:value={container.payload.fulfillmentDate} />
	</label>
</fieldset>

<fieldset class="form-tab" id="effects">
	<legend>{$_('form.effects')}</legend>

	<EffectWizard {container} />
</fieldset>
