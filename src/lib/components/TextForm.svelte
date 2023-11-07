<script lang="ts">
	import { _ } from 'svelte-i18n';
	import Editor from '$lib/components/Editor.svelte';
	import StrategyRelationSelector from '$lib/components/StrategyRelationSelector.svelte';
	import type { EmptyTextContainer, TextContainer } from '$lib/models';
	import { applicationState } from '$lib/stores';

	export let container: TextContainer | EmptyTextContainer;

	applicationState.update((state) => ({
		...state,
		containerForm: {
			activeTab: 'guid' in container ? 'basic-data' : 'metadata',
			tabs: ['metadata', 'basic-data']
		}
	}));
</script>

{#if $applicationState.containerForm.activeTab === 'metadata'}
	<fieldset class="form-tab" id="metadata">
		<legend>{$_('form.metadata')}</legend>

		<StrategyRelationSelector {container} />
	</fieldset>
{:else if $applicationState.containerForm.activeTab === 'basic-data'}
	<fieldset class="form-tab" id="basic-data">
		<legend>{$_('form.basic_data')}</legend>

		<Editor label={$_('body')} bind:value={container.payload.body} />
	</fieldset>
{/if}
