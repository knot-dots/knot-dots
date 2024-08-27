<script lang="ts">
	import { _ } from 'svelte-i18n';
	import Editor from '$lib/components/Editor.svelte';
	import ListBox from '$lib/components/ListBox.svelte';
	import OrganizationSelector from '$lib/components/OrganizationSelector.svelte';
	import StrategyRelationSelector from '$lib/components/StrategyRelationSelector.svelte';
	import { audience, type EmptyTextContainer, type TextContainer } from '$lib/models';
	import { applicationState } from '$lib/stores';

	export let container: TextContainer | EmptyTextContainer;

	applicationState.update((state) => ({
		...state,
		containerForm: {
			activeTab: 'basic-data',
			tabs: ['basic-data', 'metadata']
		}
	}));
</script>

<fieldset class="form-tab" id="basic-data">
	{#key 'guid' in container ? container.guid : ''}
		<Editor label={$_('body')} bind:value={container.payload.body} />
	{/key}
</fieldset>

<fieldset class="form-tab" id="metadata">
	<legend>{$_('form.metadata')}</legend>

	<StrategyRelationSelector {container} />

	<ListBox
		label={$_('audience')}
		options={audience.options.map((o) => ({ value: o, label: $_(o) }))}
		bind:value={container.payload.audience}
	/>

	<OrganizationSelector bind:container />
</fieldset>
