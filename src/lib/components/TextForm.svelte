<script lang="ts">
	import { _ } from 'svelte-i18n';
	import Editor from '$lib/components/Editor.svelte';
	import RelationSelector from '$lib/components/RelationSelector.svelte';
	import type { AnyContainer, EmptyTextContainer, TextContainer } from '$lib/models';
	import { applicationState } from '$lib/stores';

	export let container: TextContainer | EmptyTextContainer;
	export let isPartOfOptions: AnyContainer[];

	applicationState.update((state) => ({ ...state, showEditTabs: true }));
</script>

{#if $applicationState.containerForm.activeTab === 'metadata'}
	<fieldset class="form-tab" id="metadata">
		<RelationSelector {container} {isPartOfOptions} />
	</fieldset>
{:else if $applicationState.containerForm.activeTab === 'basic-data'}
	<fieldset class="form-tab" id="basic-data">
		<Editor label={$_('body')} bind:value={container.payload.body} />
	</fieldset>
{/if}
