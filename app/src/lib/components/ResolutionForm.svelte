<script lang="ts">
	import { _ } from 'svelte-i18n';
	import AudienceSelector from '$lib/components/AudienceSelector.svelte';
	import CategorySelector from '$lib/components/CategorySelector.svelte';
	import Editor from '$lib/components/Editor.svelte';
	import OrganizationSelector from '$lib/components/OrganizationSelector.svelte';
	import ResolutionStatusSelector from '$lib/components/ResolutionStatusSelector.svelte';
	import StrategyRelationSelector from '$lib/components/StrategyRelationSelector.svelte';
	import TopicSelector from '$lib/components/TopicSelector.svelte';
	import { resolutionStatus } from '$lib/models';
	import type { EmptyResolutionContainer, ResolutionContainer } from '$lib/models';
	import { applicationState } from '$lib/stores';

	export let container: ResolutionContainer | EmptyResolutionContainer;

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

	<fieldset class="duration">
		<label>
			{$_('valid_from')}
			<input type="date" name="validFrom" bind:value={container.payload.validFrom} />
		</label>
		{#if container.payload.resolutionStatus === resolutionStatus.enum['resolution_status.invalid']}
			<label>
				{$_('valid_until')}
				<input type="date" name="validUntil" bind:value={container.payload.validUntil} />
			</label>
		{/if}
	</fieldset>
</fieldset>

<fieldset class="form-tab" id="metadata">
	<legend>{$_('form.metadata')}</legend>

	<ResolutionStatusSelector bind:value={container.payload.resolutionStatus} />

	<StrategyRelationSelector {container} />

	<TopicSelector bind:value={container.payload.topic} />

	<CategorySelector bind:value={container.payload.category} />

	<AudienceSelector bind:value={container.payload.audience} />

	<OrganizationSelector bind:container />
</fieldset>

<style>
	.duration {
		display: flex;
		gap: 1rem;
	}
</style>
