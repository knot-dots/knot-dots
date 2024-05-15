<script lang="ts">
	import { _ } from 'svelte-i18n';
	import Editor from '$lib/components/Editor.svelte';
	import ListBox from '$lib/components/ListBox.svelte';
	import OrganizationSelector from '$lib/components/OrganizationSelector.svelte';
	import StrategyRelationSelector from '$lib/components/StrategyRelationSelector.svelte';
	import { inview } from '$lib/inview';
	import { audience, type EmptyTextContainer, type TextContainer } from '$lib/models';
	import { applicationState, setContainerFormActiveTab } from '$lib/stores';

	export let container: TextContainer | EmptyTextContainer;

	applicationState.update((state) => ({
		...state,
		containerForm: {
			activeTab: 'guid' in container ? 'basic-data' : 'metadata',
			tabs: ['metadata', 'basic-data']
		}
	}));
</script>

<fieldset
	class="form-tab"
	id="metadata"
	use:inview
	on:inview_enter={() => setContainerFormActiveTab('metadata')}
>
	<legend>{$_('form.metadata')}</legend>

	<StrategyRelationSelector {container} />

	<OrganizationSelector bind:container />

	<ListBox
		label={$_('audience')}
		options={audience.options}
		bind:value={container.payload.audience}
	/>
</fieldset>

<fieldset
	class="form-tab"
	id="basic-data"
	use:inview
	on:inview_enter={() => setContainerFormActiveTab('basic-data')}
>
	<legend>{$_('form.basic_data')}</legend>

	{#key 'guid' in container ? container.guid : ''}
		<Editor label={$_('body')} bind:value={container.payload.body} />
	{/key}
</fieldset>
