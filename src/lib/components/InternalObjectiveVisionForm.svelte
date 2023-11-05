<script lang="ts">
	import { _ } from 'svelte-i18n';
	import Editor from '$lib/components/Editor.svelte';
	import OrganizationSelector from '$lib/components/OrganizationSelector.svelte';
	import RelationSelector from '$lib/components/RelationSelector.svelte';
	import type { AnyContainer, EmptyVisionContainer, VisionContainer } from '$lib/models';

	export let container: VisionContainer | EmptyVisionContainer;
	export let isPartOfOptions: AnyContainer[];
</script>

<fieldset class="form-tab" id="metadata">
	<legend>{$_('form.metadata')}</legend>

	<RelationSelector {container} {isPartOfOptions} />

	<OrganizationSelector bind:container />
</fieldset>

<fieldset class="form-tab" id="basic-data">
	<legend>{$_('form.basic_data')}</legend>

	<label>
		{$_('summary')}
		<textarea name="summary" maxlength="200" bind:value={container.payload.summary} />
	</label>

	<Editor label={$_('description')} bind:value={container.payload.description} />
</fieldset>
