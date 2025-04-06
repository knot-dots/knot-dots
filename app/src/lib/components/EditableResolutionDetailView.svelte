<script lang="ts">
	import { _, date } from 'svelte-i18n';
	import requestSubmit from '$lib/client/requestSubmit';
	import EditableAudience from '$lib/components/EditableAudience.svelte';
	import EditableCategory from '$lib/components/EditableCategory.svelte';
	import EditableContainerDetailView from '$lib/components/EditableContainerDetailView.svelte';
	import EditableFormattedText from '$lib/components/EditableFormattedText.svelte';
	import EditableOrganization from '$lib/components/EditableOrganization.svelte';
	import EditableOrganizationalUnit from '$lib/components/EditableOrganizationalUnit.svelte';
	import EditableResolutionStatus from '$lib/components/EditableResolutionStatus.svelte';
	import EditableStrategy from '$lib/components/EditableStrategy.svelte';
	import EditableTopic from '$lib/components/EditableTopic.svelte';
	import { type AnyContainer, type Container, type ResolutionContainer } from '$lib/models';
	import { ability, applicationState } from '$lib/stores';

	export let container: ResolutionContainer;
	export let relatedContainers: Container[];
	export let revisions: AnyContainer[];
</script>

<EditableContainerDetailView {container} {relatedContainers} {revisions}>
	<svelte:fragment slot="data">
		{#if $applicationState.containerDetailView.editable}
			<div class="label">{$_('valid_from')}</div>
			<fieldset>
				<span>
					<label class="is-visually-hidden" for="validFrom">
						{$_('valid_from')}
					</label>
					<input
						class="value"
						id="validFrom"
						type="date"
						bind:value={container.payload.validFrom}
						on:change={requestSubmit}
					/>
					–
					<label class="is-visually-hidden" for="validUntil">
						{$_('valid_until')}
					</label>
					<input
						class="value"
						id="validUntil"
						type="date"
						bind:value={container.payload.validUntil}
						on:change={requestSubmit}
					/>
				</span>
			</fieldset>
		{:else}
			<div class="label">{$_('valid_from')}</div>
			<div class="value">
				{#if container.payload.validFrom && container.payload.validUntil}
					{$date(new Date(container.payload.validFrom), { format: 'long' })}–{$date(
						new Date(container.payload.validUntil),
						{ format: 'long' }
					)}
				{:else if container.payload.validFrom}
					{$date(new Date(container.payload.validFrom), { format: 'long' })}
				{:else}
					&nbsp;
				{/if}
			</div>
		{/if}

		<EditableResolutionStatus
			editable={$applicationState.containerDetailView.editable}
			bind:value={container.payload.resolutionStatus}
		/>

		<EditableStrategy editable={$applicationState.containerDetailView.editable} bind:container />

		<EditableTopic
			editable={$applicationState.containerDetailView.editable}
			bind:value={container.payload.topic}
		/>

		<EditableCategory
			editable={$applicationState.containerDetailView.editable}
			bind:value={container.payload.category}
		/>

		<EditableAudience
			editable={$applicationState.containerDetailView.editable}
			bind:value={container.payload.audience}
		/>

		{#if $ability.can('update', container.payload.type, 'organization')}
			<EditableOrganization
				editable={$applicationState.containerDetailView.editable}
				bind:value={container.organization}
			/>
		{/if}

		{#if $ability.can('update', container.payload.type, 'organizational_unit')}
			<EditableOrganizationalUnit
				editable={$applicationState.containerDetailView.editable}
				bind:value={container.organizational_unit}
			/>
		{/if}
	</svelte:fragment>

	<svelte:fragment slot="extra">
		<EditableFormattedText
			editable={$applicationState.containerDetailView.editable}
			bind:value={container.payload.description}
		/>
	</svelte:fragment>
</EditableContainerDetailView>

<style>
	fieldset {
		border: none;
		padding: 0;
	}

	input[type='date'] {
		border: none;
		border-radius: 4px;
		display: inline-flex;
		line-height: 1.5;
		max-height: 2.25rem;
		width: auto;
	}
</style>
