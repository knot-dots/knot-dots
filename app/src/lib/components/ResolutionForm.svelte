<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { page } from '$app/stores';
	import paramsFromURL from '$lib/client/paramsFromURL';
	import Editor from '$lib/components/Editor.svelte';
	import ListBox from '$lib/components/ListBox.svelte';
	import OrganizationSelector from '$lib/components/OrganizationSelector.svelte';
	import StrategyRelationSelector from '$lib/components/StrategyRelationSelector.svelte';
	import { audience, resolutionStatus, sustainableDevelopmentGoals, topics } from '$lib/models';
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
		{#if container.payload.resolutionStatus == resolutionStatus.enum['resolution_status.invalid']}
			<label>
				{$_('valid_until')}
				<input type="date" name="validUntil" bind:value={container.payload.validUntil} />
			</label>
		{/if}
	</fieldset>
</fieldset>

<fieldset class="form-tab" id="metadata">
	<legend>{$_('form.metadata')}</legend>

	<label class="meta">
		<span class="meta-value">{$_('resolution_status')}</span>
		<select
			class="meta-key"
			name="resolutionStatus"
			bind:value={container.payload.resolutionStatus}
			required
		>
			{#each resolutionStatus.options as statusOption}
				<option value={statusOption}>
					{$_(statusOption)}
				</option>
			{/each}
		</select>
	</label>

	<StrategyRelationSelector {container} />

	<ListBox
		label={$_('topic.label')}
		options={topics.options.map((o) => ({ value: o, label: $_(o) }))}
		bind:value={container.payload.topic}
	/>

	<ListBox
		label={$_('category')}
		options={sustainableDevelopmentGoals.options.map((o) => ({ value: o, label: $_(o) }))}
		bind:value={container.payload.category}
	/>

	<ListBox
		label={$_('audience')}
		options={audience.options.map((o) => ({ value: o, label: $_(o) }))}
		bind:value={container.payload.audience}
	/>

	<OrganizationSelector bind:container />
</fieldset>

<style>
	.duration {
		display: flex;
		gap: 1rem;
	}
</style>
