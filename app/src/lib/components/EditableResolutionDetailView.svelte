<script lang="ts">
	import { _, date } from 'svelte-i18n';
	import { page } from '$app/stores';
	import paramsFromURL from '$lib/client/paramsFromURL';
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
	import {
		type AnyContainer,
		type Container,
		type ResolutionContainer,
		resolutionStatus
	} from '$lib/models';
	import { ability, applicationState } from '$lib/stores';

	export let container: ResolutionContainer;
	export let relatedContainers: Container[];
	export let revisions: AnyContainer[];

	let selectedRevision: ResolutionContainer;

	$: {
		const parseResult = resolutionStatus.safeParse(
			paramsFromURL($page.url).get('resolutionStatus')
		);
		if (parseResult.success) {
			selectedRevision =
				(revisions as ResolutionContainer[]).findLast(
					({ payload }) => payload.resolutionStatus == parseResult.data
				) ?? container;
		} else {
			selectedRevision = container;
		}
	}
</script>

<EditableContainerDetailView container={selectedRevision} {relatedContainers} {revisions}>
	<svelte:fragment slot="data">
		<EditableFormattedText
			editable={$applicationState.containerDetailView.editable}
			label={$_('description')}
			bind:value={container.payload.description}
		/>

		{#if $applicationState.containerDetailView.editable}
			<fieldset class="tabular">
				<span class="label">{$_('valid_from')}</span>
				<span>
					<label class="is-visually-hidden" for="validFrom">
						{$_('valid_from')}
					</label>
					<input
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
						id="validUntil"
						type="date"
						bind:value={container.payload.validUntil}
						on:change={requestSubmit}
					/>
				</span>
			</fieldset>
		{:else}
			<p class="tabular">
				<span class="label">{$_('valid_from')}</span>
				<span class="value">
					{#if selectedRevision.payload.validFrom && selectedRevision.payload.validUntil}
						{$date(new Date(selectedRevision.payload.validFrom), { format: 'long' })}–{$date(
							new Date(selectedRevision.payload.validUntil),
							{ format: 'long' }
						)}
					{:else if selectedRevision.payload.validFrom}
						{$date(new Date(selectedRevision.payload.validFrom), { format: 'long' })}–
					{:else}
						&nbsp;
					{/if}
				</span>
			</p>
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
</EditableContainerDetailView>

<style>
	fieldset {
		border: none;
	}

	label {
		padding: 0 1rem;
	}

	input[type='date'] {
		border: none;
		display: inline-flex;
		line-height: 1.5;
		max-height: 3rem;
		width: auto;
	}
</style>
