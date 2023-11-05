<script lang="ts">
	import { _ } from 'svelte-i18n';
	import Editor from '$lib/components/Editor.svelte';
	import OrganizationSelector from '$lib/components/OrganizationSelector.svelte';
	import type { EmptyInternalStrategyContainer, InternalStrategyContainer } from '$lib/models.js';
	import { applicationState } from '$lib/stores';

	export let container: InternalStrategyContainer | EmptyInternalStrategyContainer;

	applicationState.update((state) => ({
		...state,
		containerForm: { tabs: [] }
	}));
</script>

<OrganizationSelector bind:container />

<legend>{$_('form.basic_data')}</legend>

<label>
	{$_('summary')}
	<textarea name="summary" maxlength="200" bind:value={container.payload.summary} />
</label>

<Editor label={$_('description')} bind:value={container.payload.description} />
